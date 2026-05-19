/*
=============================================================================
DEPLOYMENT GUIDE
=============================================================================
This application is configured as a Node.js + Express backend serving a static
Vite frontend. To deploy this to your Hostinger VPS:

1. Copy the code to your server (e.g. via git clone or FTP/SFTP).
2. Ensure Node.js 18+ is installed on the server.
3. Run `npm install` to install dependencies.
4. Copy `.env.example` to `.env` and fill in your SMTP credentials to enable 
   contact form emails.
5. Run `npm run build` to compile the frontend to the `dist/` directory and 
   bundle the server to `dist/server.cjs`.
6. Use a process manager like PM2 to start the server:
   `pm2 start dist/server.cjs --name "azm-website"`
7. Configure a reverse proxy (e.g. Nginx or Apache) to forward requests from 
   port 80/443 to the Node.js server running on port 3000.
=============================================================================
*/

import express from "express";
import path from "path";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  // Environment PORT variable should be fixed or controlled by ingress (Host 0.0.0.0, Port 3000 is required here)
  const PORT = 3000; 

  // Security and performance middlewares
  app.use(compression());
  app.use(express.json());
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow external images/scripts in preview environments/iframes
    crossOriginEmbedderPolicy: false
  }));

  // Rate Limiting for the contact endpoint (5 requests per 15 minutes)
  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Contact Form POST Endpoint
  app.post("/api/contact", contactLimiter, async (req, res) => {
    const { 
      name, company, phone, email, inquiryType, 
      productInterest, message, preferredContact, source 
    } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: "Name, email, phone, and message are required." });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.hostinger.com",
        port: parseInt(process.env.SMTP_PORT || "465", 10),
        secure: process.env.SMTP_SECURE === "true" || true, // typically true for 465, false for 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_USER || "noreply@alzahrabm.com",
        to: process.env.CONTACT_EMAIL || "office@alzahrabm.com",
        subject: `New Inquiry: ${inquiryType || 'General'} from ${name}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
            <h3 style="color: #1A3A5C; border-bottom: 2px solid #C9A96E; padding-bottom: 10px;">New Website Inquiry</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Company:</strong> ${company || "N/A"}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Inquiry Type:</strong> ${inquiryType || "N/A"}</p>
            <p><strong>Product Interest:</strong> ${productInterest || "N/A"}</p>
            <p><strong>Preferred Contact Method:</strong> ${preferredContact || "N/A"}</p>
            <p><strong>Heard about us via:</strong> ${source || "N/A"}</p>
            <br>
            <h4 style="color: #1A3A5C; margin-bottom: 5px;">Message:</h4>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #C9A96E;">
              ${String(message).replace(/\n/g, '<br>')}
            </div>
          </div>
        `,
      };

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
      } else {
        console.warn("[WARNING] SMTP credentials not configured. Form data was received but email was not sent.");
      }

      res.status(200).json({ success: true, message: "Inquiry sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "An error occurred while processing your request." });
    }
  });

  // Keep old endpoint for compatibility if something else invokes it
  app.post("/api/quote", (req, res) => {
    res.json({ success: true, message: "Quote request received." });
  });

  // Frontend Serving Middleware
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa", 
    });

    // Custom Dev Middleware for Clean URLs
    app.use((req, res, next) => {
      // If navigating to /about without extension, try mapping it to /about.html
      if (req.method === 'GET' && !req.path.includes('.') && req.path !== '/') {
        req.url = req.url + '.html';
      }
      next();
    });

    app.use(vite.middlewares);
    
    // 404 Catcher
    app.use((req, res) => {
      res.status(404).sendFile(path.join(process.cwd(), "404.html"));
    });
  } else {
    // Production mode - static files from /dist
    const distPath = path.join(process.cwd(), "dist");

    // Clean URL static serving
    app.use(express.static(distPath, { extensions: ["html"] }));

    app.use((req, res) => {
      res.status(404).sendFile(path.join(distPath, "404.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
