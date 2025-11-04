import nodemailer from "nodemailer"

// Create transporters for order and support emails
const orderTransporter = nodemailer.createTransport({
  host: process.env.ORDER_EMAIL_HOST,
  port: Number(process.env.ORDER_EMAIL_PORT),
  secure: process.env.ORDER_EMAIL_SECURE === "true",
  auth: {
    user: process.env.ORDER_EMAIL_USER,
    pass: process.env.ORDER_EMAIL_PASS,
  },
})

const supportTransporter = nodemailer.createTransport({
  host: process.env.SUPPORT_EMAIL_HOST,
  port: Number(process.env.SUPPORT_EMAIL_PORT),
  secure: process.env.SUPPORT_EMAIL_SECURE === "true",
  auth: {
    user: process.env.SUPPORT_EMAIL_USER,
    pass: process.env.SUPPORT_EMAIL_PASS,
  },
})

// Helper to select transporter and from address
const getMailConfig = (type) => {
  if (type === "order") {
    return {
      transporter: orderTransporter,
      from: `Baytal Protein Orders <${process.env.ORDER_EMAIL_USER}>`,
    }
  } else {
    return {
      transporter: supportTransporter,
      from: `Baytal Protein Support <${process.env.SUPPORT_EMAIL_USER}>`,
    }
  }
}

// Email templates
const getEmailTemplate = (type, data) => {
  const baseStyle = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
        line-height: 1.6; 
        color: #333; 
        background-color: #f5f5f5; 
        margin: 0; 
        padding: 20px;
      }
      .email-container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: #ffffff; 
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header { 
        background-color: #ffffff; 
        padding: 30px 20px 20px; 
        text-align: center; 
        border-bottom: 1px solid #eee;
      }
      .logo { 
        max-width: 200px; 
        height: auto; 
        margin-bottom: 20px;
      }
      .order-icon {
        width: 80px;
        height: 80px;
        background-color: #0B6EFD;
        border-radius: 50%;
        margin: 20px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 30px;
      }
      .content { 
        padding: 30px 20px; 
        background-color: #ffffff;
      }
      .order-number {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        text-align: center;
        margin-bottom: 20px;
      }
      .greeting {
        font-size: 18px;
        text-align: center;
        margin-bottom: 10px;
        color: #333;
      }
      .processing-text {
        font-size: 16px;
        text-align: center;
        color: #666;
        margin-bottom: 30px;
      }
      .action-buttons {
        text-align: center;
        margin: 30px 0;
      }
      .button {
        display: inline-block;
        background-color: #0B6EFD;
        color: white;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 25px;
        font-weight: bold;
        font-size: 14px;
        margin: 5px 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .button:hover {
        background-color: #0A58CA;
      }
      .product-section {
        margin: 30px 0;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 8px;
      }
      .product-item {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      .product-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .product-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 8px;
        margin-right: 15px;
        background-color: #f0f0f0;
      }
      .product-details {
        flex: 1;
      }
      .product-name {
        font-weight: bold;
        font-size: 16px;
        color: #333;
        margin-bottom: 5px;
        line-height: 1.4;
      }
      .product-quantity {
        color: #666;
        font-size: 14px;
        margin-bottom: 5px;
      }
      .product-price {
        font-weight: bold;
        color: #0B6EFD;
        font-size: 16px;
      }
      .order-summary {
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 16px;
      }
      .summary-row.total {
        font-weight: bold;
        font-size: 18px;
        color: #333;
        border-top: 1px solid #ddd;
        padding-top: 10px;
        margin-top: 15px;
      }
      .vat-note {
        font-size: 14px;
        color: #666;
        text-align: right;
        margin-top: 5px;
      }
      .info-section {
        margin: 20px 0;
      }
      .info-title {
        font-weight: bold;
        font-size: 18px;
        color: #333;
        margin-bottom: 15px;
      }
      .info-content {
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.6;
      }
      .address-section {
        display: flex;
        gap: 20px;
        margin: 20px 0;
      }
      .address-block {
        flex: 1;
      }
      .footer {
        background-color: #0B6EFD;
        color: white;
        padding: 30px 20px;
        text-align: center;
      }
      .footer h3 {
        margin-bottom: 20px;
        font-size: 20px;
      }
      .social-icons {
        margin: 20px 0;
      }
      .social-icon {
        display: inline-block;
        width: 40px;
        height: 40px;
        background-color: white;
        border-radius: 50%;
        margin: 0 10px;
        line-height: 40px;
        text-decoration: none;
        color: #0B6EFD;
        font-weight: bold;
      }
      .contact-info {
        margin-top: 20px;
        font-size: 14px;
      }
      .contact-info a {
        color: white;
        text-decoration: underline;
      }
      @media (max-width: 600px) {
        .email-container { margin: 0; border-radius: 0; }
        .content { padding: 20px 15px; }
        .address-section { flex-direction: column; }
        .product-item { flex-direction: column; text-align: center; }
        .product-image { margin: 0 auto 15px; }
        .button { display: block; margin: 10px 0; }
      }
    </style>
  `

  switch (type) {
    case "emailVerification":
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Email Verification</title>
          <style>
            body {
              background-color: #f2f7ff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 32px auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              border: 1px solid #e0e0e0;
            }
            .header {
              background-color: #fff;
              padding: 32px 0 16px 0;
              text-align: center;
              border-bottom: 1px solid #e0e0e0;
            }
            .header a {
              display: inline-block;
            }
            .header img {
              max-height: 60px;
            }
            .content {
              padding: 40px 30px 32px 30px;
              text-align: center;
            }
            .content h2 {
              color: #222;
              font-size: 1.5rem;
              margin-bottom: 0.5em;
            }
            .content p {
              color: #444;
              font-size: 1.1rem;
              margin: 0.5em 0 1.5em 0;
            }
            .code-box {
              background: #f4f4f4;
              border-radius: 10px;
              margin: 32px auto 24px auto;
              padding: 24px 0;
              font-size: 2.2rem;
              font-weight: bold;
              color: #0B6EFD;
              letter-spacing: 10px;
              max-width: 320px;
            }
            .copy-btn {
              display: inline-block;
              background: #0B6EFD;
              color: #fff;
              font-weight: 600;
              padding: 16px 40px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 1.1rem;
              margin: 24px 0 0 0;
              transition: background 0.2s;
              cursor: pointer;
            }
            .copy-btn:hover {
              background: #0A58CA;
            }
            .footer {
              background-color: #f2f7ff;
              padding: 32px 20px 20px 20px;
              text-align: center;
              font-size: 13px;
              color: #888;
            }
            
            @media (max-width: 600px) {
              .container { border-radius: 0; margin: 0; }
              .content { padding: 24px 8px 24px 8px; }
              .footer { padding: 24px 4px 12px 4px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <a href="https://baytalprotein.net/" target="_blank">
                <img src="https://res.cloudinary.com/dyyb62prf/image/upload/v1761983430/logoblue_uplb3m.webp" alt="Baytal Protein Logo" />
              </a>
            </div>
            <div class="content">
              <h2>Email Verification</h2>
              <p>Hi <b>${data.name || "User"}</b>,<br />
              Thank you for registering with Baytal Protein. Please verify your email address by entering the verification code below:</p>
              <div class="code-box">${data.code || "000000"}</div>
              <p style="margin: 16px 0 0 0; color: #0B6EFD; font-weight: bold;">
                Copy the code above and paste it on the website to verify your email.
              </p>
              <p style="margin-top: 2em; color: #888; font-size: 1em;">This code will expire in 10 minutes.<br />If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent by: support@baytalprotein.net</p>
              <br/>
              <p>Kindly Do Not Reply to this Email</p>
              <br/>
              <div style="margin-top: 10px; color: #888;">
                &copy; 2025 Baytal Protein. All rights reserved.<br />
                <span style="font-size:12px;">If you did not enter this email address when signing up for Baytal Protein, disregard this message.</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

    case "orderConfirmation":
      const orderItems = Array.isArray(data.orderItems) ? data.orderItems : []
      const orderItemsHtml = orderItems
        .map(
          (item) => `
        <div class="product-item">
          <img src="${item.product?.image || item.image || "/placeholder.svg?height=80&width=80"}" alt="${item.product?.name || item.name || "Product"}" class="product-image" />
          <div class="product-details">
            <div class="product-name">${item.product?.name || item.name || "Product"}</div>
            <div class="product-quantity">Quantity: ${item.quantity || 1}</div>
            <div class="product-price">AED ${(item.price || 0).toFixed(2)}</div>
          </div>
        </div>
      `,
        )
        .join("")

      const subtotal = data.itemsPrice || 0
      const shipping = data.shippingPrice || 0
      const total = data.totalPrice || 0
      const vatAmount = (total * 0.05).toFixed(2) // Assuming 5% VAT

      // Get customer info based on delivery type
      const customerName = data.shippingAddress?.name || data.pickupDetails?.name || data.customerName || "Customer"
      const customerEmail = data.shippingAddress?.email || data.pickupDetails?.email || data.customerEmail || ""
      const customerPhone = data.shippingAddress?.phone || data.pickupDetails?.phone || ""

      const billingAddress = data.shippingAddress || data.pickupDetails || {}
      const shippingAddress = data.deliveryType === "pickup" ? data.pickupDetails : data.shippingAddress

      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Order Confirmation</title>
          <style>
            body {
              background-color: #f2f7ff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 32px auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              border: 1px solid #e0e0e0;
            }
            .header {
              background-color: #fff;
              padding: 32px 0 16px 0;
              text-align: center;
              border-bottom: 1px solid #e0e0e0;
            }
            .header a {
              display: inline-block;
            }
            .header img {
              max-height: 60px;
            }
            .order-icon { width: 80px; height: 80px; background: transparent !important; border-radius: 0; margin: 8px auto 8px auto; display: flex; align-items: center; justify-content: center; color: #0B6EFD; font-size: 44px; line-height: 1; }
            .content {
              padding: 40px 30px 32px 30px;
              background: #fff;
            }
            .order-number {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              text-align: center;
              margin-bottom: 20px;
            }
            .greeting {
              font-size: 18px;
              text-align: center;
              margin-bottom: 10px;
              color: #333;
            }
            .processing-text {
              font-size: 16px;
              text-align: center;
              color: #666;
              margin-bottom: 30px;
            }
            .hero { background: #eaf2ff; border: 1px solid #e0eaff; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            .action-buttons {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background-color: #0B6EFD;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              font-size: 14px;
              margin: 5px 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .button:hover {
              background-color: #0A58CA;
            }
            .product-section {
              margin: 30px 0;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 8px;
              border: 1px solid #eee;
            }
            .product-item {
              display: flex;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .product-item:last-child {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            .product-image {
              width: 80px;
              height: 80px;
              object-fit: cover;
              border-radius: 8px;
              margin-right: 15px;
              background-color: #f0f0f0;
            }
            .product-details {
              flex: 1;
            }
            .product-name {
              font-weight: bold;
              font-size: 16px;
              color: #333;
              margin-bottom: 5px;
              line-height: 1.4;
            }
            .product-quantity {
              color: #666;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .product-price {
              font-weight: bold;
              color: #0B6EFD;
              font-size: 16px;
            }
            .order-summary {
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #eee;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .summary-row.total {
              font-weight: bold;
              font-size: 18px;
              color: #333;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              margin-top: 15px;
            }
            .vat-note {
              font-size: 14px;
              color: #666;
              text-align: right;
              margin-top: 5px;
            }
            .info-section {
              margin: 20px 0;
            }
            .info-title {
              font-weight: bold;
              font-size: 18px;
              color: #333;
              margin-bottom: 15px;
            }
            .info-content {
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
              font-size: 14px;
              line-height: 1.6;
              border: 1px solid #eee;
            }
            .address-section {
              display: flex;
              gap: 20px;
              margin: 20px 0;
            }
            .address-block {
              flex: 1;
            }
            .footer {
              background-color: #f2f7ff;
              padding: 32px 20px 20px 20px;
              text-align: center;
              font-size: 13px;
              color: #888;
            }
            
            @media (max-width: 600px) {
              .container { border-radius: 0; margin: 0; }
              .content { padding: 24px 8px 24px 8px; }
              .footer { padding: 24px 4px 12px 4px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <a href="https://baytalprotein.net/" target="_blank">
                <img src="https://res.cloudinary.com/dyyb62prf/image/upload/v1761983430/logoblue_uplb3m.webp" alt="Baytal Protein Logo" />
              </a>
            </div>
            <div class="content">
              <div class="hero">
                <div class="order-icon">🛒</div>
                <div class="order-number">Order #${data.orderNumber || data._id?.toString().slice(-6) || "N/A"}</div>
                <div class="greeting">Hi ${customerName}, Thank you for your purchase.</div>
                <div class="processing-text">We are processing your order.</div>
              </div>
              <div class="action-buttons">
                <a href="${process.env.FRONTEND_URL || "https://baytalprotein.net/"}" class="button" style="color:#ffffff !important;">Visit Website</a>
                <a href="${process.env.FRONTEND_URL || "https://baytalprotein.net/"}/track-order" class="button" style="background:#d9a82e !important; color:#ffffff !important; text-decoration:none;">Order Tracking</a>
              </div>
              
            </div>
            <div class="footer">
              <p>This email was sent by: order@baytalprotein.net</p>
              <br/>
              <p>Kindly Do Not Reply to this Email</p>
              <br/>
              <div style="margin-top: 10px; color: #888;">
                &copy; 2025 Baytal Protein. All rights reserved.<br />
                <span style="font-size:12px;">If you did not enter this email address when signing up for Baytal Protein, disregard this message.</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

    case "orderStatusUpdate":
      // Status icon and label for current status only
      const statusSteps = [
        { key: "Processing", label: "Processing", icon: "⚙️" },
        { key: "Confirmed", label: "Confirmed", icon: "✅" },
        { key: "Ready for Shipment", label: "Ready for Shipment", icon: "📦" },
        { key: "Shipped", label: "Shipped", icon: "📦" },
        { key: "On the Way", label: "On the Way", icon: "🚚" },
        { key: "Out for Delivery", label: "Out for Delivery", icon: "🚚" },
        { key: "Delivered", label: "Delivered", icon: "🎉" },
        { key: "On Hold", label: "On Hold", icon: "⏸️" },
        { key: "Cancelled", label: "Cancelled", icon: "❌" },
      ]
      const getCurrentStep = (status) => {
        if (!status) return statusSteps[0]
        const normalized = status.trim().toLowerCase()
        if (normalized === "processing") return statusSteps[0]
        if (normalized === "confirmed") return statusSteps[1]
        if (normalized === "ready for shipment") return statusSteps[2]
        if (normalized === "shipped") return statusSteps[3]
        if (normalized === "on the way") return statusSteps[4]
        if (normalized === "out for delivery") return statusSteps[5]
        if (normalized === "delivered") return statusSteps[6]
        if (normalized === "on hold") return statusSteps[7]
        if (normalized === "cancelled") return statusSteps[8]
        return statusSteps[0]
      }
      const currentStep = getCurrentStep(data.status)
      const normalizedStatus = (data.status || "").toString().trim().toLowerCase()
      const showSummary = normalizedStatus === "delivered"
      // Order summary table (scoped variables)
      const statusOrderItems = Array.isArray(data.orderItems) ? data.orderItems : []
      const statusOrderItemsHtml = statusOrderItems
        .map((item) => {
          // Truncate product name to two lines (max 80 chars)
          let name = item.product?.name || item.name || "Product"
          if (name.length > 80) name = name.slice(0, 77) + "..."
          return `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 0;"><img src="${item.product?.image || item.image || "/placeholder.svg?height=80&width=80"}" alt="${name}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;background:#f0f0f0;" /></td>
            <td style="padding:10px 0 10px 12px;font-size:15px;color:#222;max-width:220px;line-height:1.3;">${name}</td>
            <td style="padding:10px 0;font-size:15px;color:#333;">AED ${(item.price || 0).toFixed(2)}</td>
            <td style="padding:10px 0;font-size:15px;color:#333;">${item.quantity || 1}</td>
          </tr>
        `
        })
        .join("")
      const statusSubtotal = data.itemsPrice || 0
      const statusShipping = data.shippingPrice || 0
      const statusTotal = data.totalPrice || 0
      const statusVatAmount = (statusTotal * 0.05).toFixed(2)
      const paymentStatus = data.isPaid ? "Paid" : "Unpaid"
      const paymentMethod = data.paymentMethod || "Cash on Delivery"
      const customerEmailForInvoice =
        data.shippingAddress?.email || data.pickupDetails?.email || data.user?.email || ""
      const apiBase =
        process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.SERVER_URL || process.env.FRONTEND_URL ||
        "https://baytalprotein.net"
      const invoiceUrl = `${apiBase}/api/orders/${data._id || ""}/invoice?email=${encodeURIComponent(
        customerEmailForInvoice,
      )}`
      const orderSummaryHtml = `
              <table class="order-summary-table">
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                </tr>
                ${statusOrderItemsHtml}
              </table>
              <table class="order-summary-totals">
                <tr><td style="text-align:right;">Subtotal:</td><td style="text-align:right;">AED ${statusSubtotal.toFixed(2)}</td></tr>
                <tr><td style="text-align:right;">Shipping:</td><td style="text-align:right;">AED ${statusShipping.toFixed(2)}</td></tr>
                <tr class="total"><td style="text-align:right;">Total:</td><td style="text-align:right;">AED ${statusTotal.toFixed(2)}</td></tr>
                <tr><td colspan="2" class="vat">(includes ${statusVatAmount} AED VAT)</td></tr>
                <tr><td style="text-align:right;">Payment Status:</td><td style="text-align:right; font-weight:600; color:${
                  data.isPaid ? "#198754" : "#dc3545"
                }">${paymentStatus}</td></tr>
                <tr><td style="text-align:right;">Payment Method:</td><td style="text-align:right;">${paymentMethod}</td></tr>
              </table>
      `
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Order Status Update</title>
          <style>
            body { background-color: #f2f7ff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 32px auto; background-color: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; }
            .action-buttons {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background-color: #0B6EFD;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              font-size: 14px;
              margin: 5px 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header { background-color: #fff; padding: 32px 0 16px 0; text-align: center; border-bottom: 1px solid #e0e0e0; }
            .header a { display: inline-block; }
            .header img { max-height: 60px; }
            .order-icon { width: 80px; height: 80px; background-color: #0B6EFD; border-radius: 50%; margin: 20px auto 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; }
            .content { padding: 40px 30px 32px 30px; background: #fff; }
            .order-number { font-size: 24px; font-weight: bold; color: #333; text-align: center; margin-bottom: 20px; }
            .greeting { font-size: 18px; text-align: center; margin-bottom: 10px; color: #333; }
            .processing-text { font-size: 16px; text-align: center; color: #666; margin-bottom: 30px; }
            /* Grouped status header section */
            .status-hero { background: #eaf2ff; border: 1px solid #e0eaff; padding: 20px; border-radius: 12px; text-align: center; margin: 10px 0 24px 0; }
            .status-hero .order-number { margin-bottom: 8px; }
            .status-hero .greeting { margin-bottom: 6px; }
            .status-hero .processing-text { margin-bottom: 12px; }
            .status-badge { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; margin: 24px 0 8px 0; gap: 6px; width: 100%; }
            .status-icon { font-size: 40px; line-height: 1; color: #0A58CA; background: none; width: auto; height: auto; margin: 0; box-shadow: none; }
            .status-label { font-size: 18px; font-weight: 700; color: #0A58CA; letter-spacing: 0.2px; text-align: center; }
            .order-summary-table { width: 100%; border-collapse: collapse; margin: 30px 0 10px 0; }
            .order-summary-table th { background: #f9f9f9; color: #333; font-size: 15px; font-weight: 600; padding: 10px 0; border-bottom: 2px solid #e0e0e0; }
            .order-summary-table td { text-align: center; }
            .order-summary-totals { width: 100%; margin-top: 10px; }
            .order-summary-totals td { font-size: 15px; padding: 6px 0; color: #333; }
            .order-summary-totals .total { font-weight: bold; font-size: 17px; color: #0A58CA; }
            .order-summary-totals .vat { font-size: 13px; color: #888; text-align: right; }
            .footer { background-color: #f2f7ff; padding: 32px 20px 20px 20px; text-align: center; font-size: 13px; color: #888; }
            @media (max-width: 600px) { .container { border-radius: 0; margin: 0; } .content { padding: 24px 8px 24px 8px; } .footer { padding: 24px 4px 12px 4px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <a href="https://baytalprotein.net/" target="_blank">
                <img src="https://res.cloudinary.com/dyyb62prf/image/upload/v1761983430/logoblue_uplb3m.webp" alt="Baytal Protein Logo" />
              </a>
            </div>
            <div class="content">
              <div class="status-hero">
                <div class="order-number">Order #${data.orderNumber || data._id?.toString().slice(-6) || "N/A"}</div>
                <div class="greeting">Hello ${data.customerName || "Customer"}!</div>
                <div class="processing-text">Your order status has been updated.</div>
                <div class="status-badge" style="width:100%;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td align="center" style="padding:0;">
                        <div style="font-size:40px; line-height:1; color:#0A58CA; margin:0 0 6px 0;">${currentStep.icon}</div>
                        <div style="font-size:18px; font-weight:700; color:#0A58CA; margin:0;">${currentStep.label}</div>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              ${showSummary ? orderSummaryHtml : ""}
              <div class="action-buttons">
                ${
                  showSummary
                    ? `<a href="${invoiceUrl}" download class="button" style="background:#198754 !important; color:#ffffff !important; text-decoration:none;">Download Invoice</a>`
                    : ""
                }
                <a href="${process.env.FRONTEND_URL || "https://baytalprotein.net/"}/track-order" class="button" style="background:#d9a82e !important; color:#ffffff !important; text-decoration:none;">Track Your Order</a>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by: order@baytalprotein.net</p>
              <br/>
              <p>Kindly Do Not Reply to this Email</p>
              <br/>
              <div style="margin-top: 10px; color: #888;">
                &copy; 2025 Baytal Protein. All rights reserved.<br />
                <span style="font-size:12px;">If you did not enter this email address when signing up for Baytal Protein, disregard this message.</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

    case "reviewVerification":
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Review Verification</title>
          <style>
            body {
              background-color: #f2f7ff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 32px auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              border: 1px solid #e0e0e0;
            }
            .header {
              background-color: #fff;
              padding: 32px 0 16px 0;
              text-align: center;
              border-bottom: 1px solid #e0e0e0;
            }
            .header a {
              display: inline-block;
            }
            .header img {
              max-height: 60px;
            }
            .content {
              padding: 40px 30px 32px 30px;
              text-align: center;
            }
            .content h2 {
              color: #222;
              font-size: 1.5rem;
              margin-bottom: 0.5em;
            }
            .content p {
              color: #444;
              font-size: 1.1rem;
              margin: 0.5em 0 1.5em 0;
            }
            .code-box {
              background: #f4f4f4;
              border-radius: 10px;
              margin: 32px auto 24px auto;
              padding: 24px 0;
              font-size: 2.2rem;
              font-weight: bold;
              color: #0B6EFD;
              letter-spacing: 10px;
              max-width: 320px;
            }
            .product-info {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: left;
            }
            .footer {
              background-color: #f2f7ff;
              padding: 32px 20px 20px 20px;
              text-align: center;
              font-size: 13px;
              color: #888;
            }
            
            @media (max-width: 600px) {
              .container { border-radius: 0; margin: 0; }
              .content { padding: 24px 8px 24px 8px; }
              .footer { padding: 24px 4px 12px 4px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <a href="https://baytalprotein.net/" target="_blank">
                <img src="https://res.cloudinary.com/dyyb62prf/image/upload/v1761983430/logoblue_uplb3m.webp" alt="Baytal Protein Logo" />
              </a>
            </div>
            <div class="content">
              <h2>Verify Your Review</h2>
              <p>Hi <b>${data.name || "Customer"}</b>,<br />
              Thank you for taking the time to review our product. Please verify your email address by entering the verification code below:</p>
              <div class="code-box">${data.code || "000000"}</div>
              <div class="product-info">
                <strong>Product:</strong> ${data.productName || "Product"}<br />
                <strong>Your Rating:</strong> ${data.rating || 5}/5 stars<br />
                <strong>Your Review:</strong> "${data.comment || "No comment"}"
              </div>
              <p style="margin: 16px 0 0 0; color: #0B6EFD; font-weight: bold;">
                Copy the code above and paste it on the website to verify and publish your review.
              </p>
              <p style="margin-top: 2em; color: #888; font-size: 1em;">This code will expire in 10 minutes.<br />If you didn't submit this review, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent by: support@baytalprotein.net</p>
              <br/>
              <p>Kindly Do Not Reply to this Email</p>
              <br/>
              <div style="margin-top: 10px; color: #888;">
                &copy; 2025 Baytal Protein. All rights reserved.<br />
                <span style="font-size:12px;">If you did not submit this review, disregard this message.</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Baytal Protein</title>
          ${baseStyle}
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://baitulProtein/Baitullogo.webp" alt="Baytal Protein" class="logo" />
            </div>
            <div class="content">
              <p>Thank you for choosing Baytal Protein!</p>
            </div>
            <div class="footer">
              <div class="contact-info">
                <p><strong>This email was sent by:</strong><br>
                <a href="mailto:order@baytalprotein.net">order@baytalprotein.net</a></p>
                <p><strong>For any questions please send an email to:</strong><br>
                <a href="mailto:support@baytalprotein.net">support@baytalprotein.net</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
  }
}

// Generic send email function with sender type
const sendEmail = async (to, subject, html, senderType = "support") => {
  try {
    const { transporter, from } = getMailConfig(senderType)
    if (senderType === "support") {
      console.log("[DEBUG] SUPPORT_EMAIL_USER:", process.env.SUPPORT_EMAIL_USER)
    }
    const mailOptions = {
      from,
      to,
      subject,
      html,
    }
    const result = await transporter.sendMail(mailOptions)
    console.log(`Email sent successfully from ${from}:`, result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("Failed to send email:", error)
    throw new Error(`Email sending failed: ${error.message}`)
  }
}

// Send verification email
export const sendVerificationEmail = async (email, name, code) => {
  try {
    const html = getEmailTemplate("emailVerification", { name, code })
    await sendEmail(email, "Verify Your Email - Baytal Protein", html, "support")
    return { success: true }
  } catch (error) {
    console.error("Failed to send verification email:", error)
    throw error
  }
}

// Send order placed email
export const sendOrderPlacedEmail = async (order) => {
  try {
    const orderNumber = order._id.toString().slice(-6)
    const customerName = order.shippingAddress?.name || order.pickupDetails?.name || "Customer"
    const customerEmail = order.shippingAddress?.email || order.pickupDetails?.email || order.user?.email

    if (!customerEmail) {
      console.error("No customer email found for order:", order._id)
      return { success: false, error: "No customer email" }
    }

    const html = getEmailTemplate("orderConfirmation", {
      ...order.toObject(),
      orderNumber,
      customerName,
      customerEmail,
    })

    await sendEmail(customerEmail, `Order Confirmation #${orderNumber} - Baytal Protein`, html, "order")
    return { success: true }
  } catch (error) {
    console.error("Failed to send order placed email:", error)
    throw error
  }
}

// Send order status update email
export const sendOrderStatusUpdateEmail = async (order) => {
  try {
    const orderNumber = order._id.toString().slice(-6)
    const customerName = order.shippingAddress?.name || order.pickupDetails?.name || order.user?.name || "Customer"
    const customerEmail = order.shippingAddress?.email || order.pickupDetails?.email || order.user?.email

    // Skip sending any email for Deleted or Ready for Shipment statuses
    const normalizedStatus = (order.status || "").toString().trim().toLowerCase()
    if (normalizedStatus === "deleted" || normalizedStatus === "ready for shipment") {
      console.warn(`Skipping email for order #${orderNumber} because status is ${order.status}`)
      return { success: true, skipped: true, reason: "status_deleted" }
    }

    if (!customerEmail) {
      console.error("No customer email found for order:", order._id)
      return { success: false, error: "No customer email" }
    }

    const html = getEmailTemplate("orderStatusUpdate", {
      ...order.toObject(),
      orderNumber,
      customerName,
    })

    const statusMessages = {
      processing: "Order is Being Processed",
      confirmed: "Order Confirmed",
      "ready for shipment": "Order Ready for Shipment",
      shipped: "Order Shipped",
      "on the way": "Order On the Way",
      delivered: "Order Delivered",
      cancelled: "Order Cancelled",
      deleted: "Order Deleted", // not used due to early return
      "on hold": "Order On Hold",
    }

    const subject = `${statusMessages[normalizedStatus] || "Order Update"} #${orderNumber} - Baytal Protein`
    await sendEmail(customerEmail, subject, html, "order")
    return { success: true }
  } catch (error) {
    console.error("Failed to send order status update email:", error)
    throw error
  }
}

// Send review verification email
export const sendReviewVerificationEmail = async (email, name, code, productName, rating, comment) => {
  try {
    const html = getEmailTemplate("reviewVerification", { name, code, productName, rating, comment })
    await sendEmail(email, "Verify Your Product Review - Baytal Protein", html, "support")
    return { success: true }
  } catch (error) {
    console.error("Failed to send review verification email:", error)
    throw error
  }
}

// Backward compatibility exports
export const sendOrderNotification = sendOrderStatusUpdateEmail
export const sendTrackingUpdateEmail = sendOrderStatusUpdateEmail

export const sendNewsletterConfirmation = async (email, preferences) => {
  const html = `
    <div>
      <h2>Thank you for subscribing to our newsletter!</h2>
      <p>Your preferences: <b>${(preferences || []).join(", ")}</b></p>
      <p>You will now receive updates according to your selected preferences.</p>
      <p style="color: #888; font-size: 13px; margin-top: 24px;">This is an automated message. Please do not reply.</p>
    </div>
  `
  await sendEmail(email, "Newsletter Subscription Confirmed - Baytal Protein", html, "support")
}

export const sendResetPasswordEmail = async (email, name, resetLink) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 32px;">
  <h2 style="color: #0A58CA;">Reset Your Password</h2>
        <p>Hi ${name || "User"},</p>
        <p>We received a request to reset your password. Click the button below to set a new password. This link is valid for 60 minutes.</p>
  <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #0B6EFD; color: #fff; border-radius: 4px; text-decoration: none; font-weight: bold;">Reset Password</a>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">&copy; ${new Date().getFullYear()} Baytal Protein</p>
      </div>
    `
    await sendEmail(email, "Reset Your Password - Baytal Protein", html, "support")
    return { success: true }
  } catch (error) {
    console.error("Failed to send reset password email:", error)
    throw error
  }
}

export { sendEmail }

export default {
  sendVerificationEmail,
  sendOrderPlacedEmail,
  sendOrderStatusUpdateEmail,
  sendOrderNotification,
  sendTrackingUpdateEmail,
  sendNewsletterConfirmation,
  sendReviewVerificationEmail,
}
