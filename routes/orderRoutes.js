
import express from "express"
import asyncHandler from "express-async-handler"
import Order from "../models/orderModel.js"
import { protect, admin } from "../middleware/authMiddleware.js"
import { sendOrderPlacedEmail, sendOrderStatusUpdateEmail } from "../utils/emailService.js"
import PDFDocument from "pdfkit"

const router = express.Router()

// Middleware to optionally protect routes (sets req.user if token exists)
const optionalProtect = asyncHandler(async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const jwt = await import('jsonwebtoken')
      const User = await import('../models/userModel.js')
      
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET)
      req.user = await User.default.findById(decoded.id).select('-password')
    } catch (error) {
      console.log('Optional auth failed:', error.message)
      // Don't throw error, just continue without user
    }
  }
  next()
})

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (supports both authenticated and guest checkout)
router.post(
  "/",
  optionalProtect,
  asyncHandler(async (req, res) => {
    const {
      orderItems,
      shippingAddress,
      pickupDetails,
      deliveryType,
      itemsPrice,
      shippingPrice,
      totalPrice,
      customerNotes,
    } = req.body

    if (!orderItems || orderItems.length === 0) {
      res.status(400)
      throw new Error("No order items")
    }

    if (!deliveryType || !["home", "pickup"].includes(deliveryType)) {
      res.status(400)
      throw new Error("Invalid or missing delivery type")
    }

    if (deliveryType === "home") {
      // Validate shipping address fields
      if (
        !shippingAddress ||
        !shippingAddress.name ||
        !shippingAddress.email ||
        !shippingAddress.phone ||
        !shippingAddress.address ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zipCode
      ) {
        res.status(400)
        throw new Error("Missing shipping address details for home delivery")
      }
    }

    if (deliveryType === "pickup") {
      // Validate pickup details fields
      if (!pickupDetails || !pickupDetails.phone || !pickupDetails.location || !pickupDetails.storeId) {
        res.status(400)
        throw new Error("Missing pickup details for store pickup")
      }
    }

    const order = new Order({
      orderItems,
      user: req.user ? req.user._id : null, // Always set user field, null for guests
      deliveryType,
      shippingAddress: deliveryType === "home" ? shippingAddress : undefined,
      pickupDetails: deliveryType === "pickup" ? pickupDetails : undefined,
      itemsPrice,
      shippingPrice,
      totalPrice,
      customerNotes,
        status: "New",
    })

    const createdOrder = await order.save()

    // Populate the user information for the created order
    await createdOrder.populate("user", "name email")
    await createdOrder.populate("orderItems.product", "name image")

    // Populate order items for email
    await createdOrder.populate("orderItems.product", "name image")

    // Send order confirmation email
    try {
      await sendOrderPlacedEmail(createdOrder)
      console.log(`Order confirmation email sent for order ${createdOrder._id}`)
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError)
      // Don't fail the order creation if email fails
    }

    res.status(201).json(createdOrder)
  }),
)

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put(
  "/:id/status",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { status, trackingId } = req.body

    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image")

    if (!order) {
      res.status(404)
      throw new Error("Order not found")
    }

    const oldStatus = order.status
    order.status = status

    if (trackingId) {
      order.trackingId = trackingId
    }

    const updatedOrder = await order.save()

    // Send status update email if status changed
    if (oldStatus !== status) {
      try {
        await sendOrderStatusUpdateEmail(updatedOrder)
        console.log(`Order status update email sent for order ${updatedOrder._id}`)
      } catch (emailError) {
        console.error("Failed to send order status update email:", emailError)
        // Don't fail the status update if email fails
      }
    }

    res.json(updatedOrder)
  }),
)

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get(
  "/myorders",
  protect,
  asyncHandler(async (req, res) => {
    // Find orders directly associated with user
    const userOrders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name image')
      .sort({ createdAt: -1 })

    // Find orders that might be associated through email (for orphaned orders)
    const emailOrders = await Order.find({
      user: null,
      $or: [
        { 'shippingAddress.email': req.user.email },
        { 'pickupDetails.email': req.user.email }
      ]
    })
      .populate('orderItems.product', 'name image')
      .sort({ createdAt: -1 })
    
    // Also check for orders with undefined user field
    const undefinedUserOrders = await Order.find({
      user: { $exists: false },
      $or: [
        { 'shippingAddress.email': req.user.email },
        { 'pickupDetails.email': req.user.email }
      ]
    })
      .populate('orderItems.product', 'name image')
      .sort({ createdAt: -1 })

    // Update orphaned orders to associate them with the user
    const ordersToUpdate = [...emailOrders, ...undefinedUserOrders]
    if (ordersToUpdate.length > 0) {
      await Order.updateMany(
        {
          _id: { $in: ordersToUpdate.map(order => order._id) }
        },
        { user: req.user._id }
      )
      
      // Update the user field in the returned orders
      ordersToUpdate.forEach(order => {
        order.user = req.user._id
      })
    }

    // Combine and sort all orders
    const allOrders = [...userOrders, ...ordersToUpdate]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    res.json(allOrders)
  }),
)

// @desc    Track order by email and order ID
// @route   POST /api/orders/track
// @access  Public
router.post(
  "/track",
  asyncHandler(async (req, res) => {
    const { email, orderId } = req.body

    if (!email || !orderId) {
      res.status(400)
      throw new Error("Email and Order ID are required")
    }

    // Clean the order ID - remove # if present and handle different formats
    const cleanOrderId = orderId.toString().replace(/^#/, "").trim()

    console.log(`Tracking order with email: ${email}, orderId: ${cleanOrderId}`)

    let order = null

    try {
      // First try to find by MongoDB ObjectId if it looks like one
      if (cleanOrderId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log("Searching by MongoDB ObjectId...")

        // Search in multiple ways for the email
        order = await Order.findOne({
          _id: cleanOrderId,
          $or: [{ "shippingAddress.email": email }, { "pickupDetails.email": email }],
        })
          .populate("orderItems.product", "name image")
          .populate("user", "name email")

        // If not found with address emails, try with user email
        if (!order) {
          const orderWithUser = await Order.findById(cleanOrderId)
            .populate("orderItems.product", "name image")
            .populate("user", "name email")

          if (orderWithUser && orderWithUser.user && orderWithUser.user.email === email) {
            order = orderWithUser
          }
        }
      }

      // If not found by ObjectId, try other methods
      if (!order) {
        console.log("Searching by other methods...")

        // Get all orders for this email from different sources
        const orders = await Order.find({
          $or: [{ "shippingAddress.email": email }, { "pickupDetails.email": email }],
        })
          .populate("orderItems.product", "name image")
          .populate("user", "name email")

        // Also get orders where user email matches
        const userOrders = await Order.find({})
          .populate("orderItems.product", "name image")
          .populate("user", "name email")

        const userMatchOrders = userOrders.filter((o) => o.user && o.user.email === email)

        // Combine all orders
        const allOrders = [...orders, ...userMatchOrders]

        // Remove duplicates
        const uniqueOrders = allOrders.filter(
          (order, index, self) => index === self.findIndex((o) => o._id.toString() === order._id.toString()),
        )

        console.log(`Found ${uniqueOrders.length} orders for email ${email}`)

        // Find order that matches the ID pattern
        order = uniqueOrders.find((o) => {
          const orderIdStr = o._id.toString()
          return (
            orderIdStr === cleanOrderId ||
            orderIdStr.toLowerCase().includes(cleanOrderId.toLowerCase()) ||
            cleanOrderId.toLowerCase().includes(orderIdStr.toLowerCase()) ||
            (o.trackingId && o.trackingId.includes(cleanOrderId)) ||
            (o.orderNumber && o.orderNumber.includes(cleanOrderId)) ||
            orderIdStr.slice(-6) === cleanOrderId || // Last 6 characters
            orderIdStr.slice(-8) === cleanOrderId // Last 8 characters
          )
        })
      }

      if (!order) {
        console.log("Order not found, trying partial match...")

        // Last resort: try partial matching on all orders
        const allOrders = await Order.find({})
          .populate("orderItems.product", "name image")
          .populate("user", "name email")

        const matchingOrders = allOrders.filter((o) => {
          // Check if email matches in any field
          const emailMatch =
            (o.shippingAddress && o.shippingAddress.email === email) ||
            (o.pickupDetails && o.pickupDetails.email === email) ||
            (o.user && o.user.email === email)

          if (!emailMatch) return false

          // Check if order ID matches in any way
          const orderIdStr = o._id.toString()
          return (
            orderIdStr.includes(cleanOrderId) ||
            cleanOrderId.includes(orderIdStr) ||
            (o.trackingId && (o.trackingId.includes(cleanOrderId) || cleanOrderId.includes(o.trackingId)))
          )
        })

        if (matchingOrders.length > 0) {
          order = matchingOrders[0] // Take the first match
          console.log(`Found order via partial match: ${order._id}`)
        }
      }

      if (!order) {
        console.log("No order found after all attempts")
        res.status(404)
        throw new Error("Order not found with the provided email and order ID. Please check your email and order ID.")
      }

      console.log(`Successfully found order: ${order._id}`)
      res.json(order)
    } catch (error) {
      console.error("Error in order tracking:", error)
      res.status(500)
      throw new Error("Error occurred while tracking order. Please try again.")
    }
  }),
)

// @desc    Download invoice PDF (public with email verification)
// @route   GET /api/orders/:id/invoice
// @access  Public (requires matching email)
router.get(
  "/:id/invoice",
  asyncHandler(async (req, res) => {
    const { email } = req.query
    const orderId = req.params.id

    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("orderItems.product", "name image")

    if (!order) {
      res.status(404)
      throw new Error("Order not found")
    }

    // Basic email-based authorization (matches shipping, pickup or user email)
    const allowedEmails = [
      order.shippingAddress?.email,
      order.pickupDetails?.email,
      order.user?.email,
    ].filter(Boolean)

    if (!email || !allowedEmails.map((e) => e.toLowerCase()).includes(String(email).toLowerCase())) {
      res.status(403)
      throw new Error("Unauthorized to download invoice for this order")
    }

    const shortId = order._id.toString().slice(-6)

    // Prepare PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${shortId}.pdf`)
    doc.pipe(res)

    // Header
    doc
      .fontSize(20)
      .fillColor("#0A58CA")
      .text("Baytal Protein", { align: "left" })
      .moveDown(0.3)
    doc
      .fontSize(14)
      .fillColor("#000")
      .text("TAX INVOICE", { align: "left" })
      .moveDown()

    // Order info
    const createdAt = new Date(order.createdAt).toLocaleDateString()
    const paymentStatus = order.isPaid ? "Paid" : "Unpaid"
    const paymentMethod = order.paymentMethod || "Cash on Delivery"
    const deliveryType = order.deliveryType === "pickup" ? "Store Pickup" : "Home Delivery"

    doc
      .fontSize(10)
      .text(`Order #${shortId}`)
      .text(`Date: ${createdAt}`)
      .text(`Status: ${order.status}`)
      .text(`Payment Status: ${paymentStatus}`)
      .text(`Payment Method: ${paymentMethod}`)
      .text(`Delivery: ${deliveryType}`)
      .moveDown()

    // Address
    const addr = order.deliveryType === "pickup" ? order.pickupDetails : order.shippingAddress
    if (addr) {
      doc
        .fontSize(10)
        .text("Bill To:")
        .text(addr.name || "Customer")
        .text(addr.address || addr.location || "")
        .text(`${addr.city || ""}`)
        .text(`Phone: ${addr.phone || ""}`)
        .moveDown()
    }

    // Table header
    const tableTop = doc.y
    const colX = { product: 50, qty: 330, price: 400, total: 480 }
    doc
      .fontSize(10)
      .fillColor("#111")
      .text("Product", colX.product, tableTop)
      .text("Qty", colX.qty, tableTop)
      .text("Price", colX.price, tableTop)
      .text("Total", colX.total, tableTop)
    doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).strokeColor("#ddd").stroke()

    // Table rows
    let y = tableTop + 20
    order.orderItems.forEach((item) => {
      const price = Number(item.price) || 0
      const qty = Number(item.quantity) || 0
      const lineTotal = price * qty
      doc
        .fontSize(10)
        .fillColor("#000")
        .text(item.name || item.product?.name || "Product", colX.product, y, { width: 260 })
        .text(qty.toString(), colX.qty, y)
        .text(`AED ${price.toFixed(2)}`, colX.price, y)
        .text(`AED ${lineTotal.toFixed(2)}`, colX.total, y)
      y += 18
    })

    // Totals
    const subtotal = Number(order.itemsPrice) || 0
    const shipping = Number(order.shippingPrice) || 0
    const total = Number(order.totalPrice) || 0
    const vat = total * 0.05

    doc.moveTo(50, y + 6).lineTo(550, y + 6).strokeColor("#ddd").stroke()
    y += 16
    const labelX = 380
    doc
      .fontSize(10)
      .text("Subtotal:", labelX, y)
      .text(`AED ${subtotal.toFixed(2)}`, colX.total, y, { align: "right" })
    y += 16
    doc.text("Shipping:", labelX, y).text(`AED ${shipping.toFixed(2)}`, colX.total, y, { align: "right" })
    y += 16
    doc.text("VAT (5%):", labelX, y).text(`AED ${vat.toFixed(2)}`, colX.total, y, { align: "right" })
    y += 16
    doc
      .font("Helvetica-Bold")
      .text("Total:", labelX, y)
      .text(`AED ${total.toFixed(2)}`, colX.total, y, { align: "right" })
      .font("Helvetica")
    y += 24

    // Footer
    doc
      .fontSize(9)
      .fillColor("#555")
      .text("Thank you for your purchase!", 50, y)
      .moveDown()

    doc.end()
  }),
)

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)

    if (order) {
      res.json(order)
    } else {
      res.status(404)
      throw new Error("Order not found")
    }
  }),
)

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
router.get(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({})
      .populate("user", "name email")
      .populate("orderItems.product", "name image")
      .sort({ createdAt: -1 })

    res.json(orders)
  }),
)

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Admin
router.get(
  "/stats",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$totalPrice" },
        },
      },
    ])

    const totalOrders = await Order.countDocuments()
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ])

    res.json({
      statusStats: stats,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    })
  }),
)

export default router
