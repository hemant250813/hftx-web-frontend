import nodemailer from "nodemailer";

const recipient = "ceo@hftxai.com";

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  service?: string;
  message?: string;
};

const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;
    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const company = body.company?.trim() || "Not provided";
    const service = body.service?.trim() || "General Support";
    const message = body.message?.trim() || "";

    if (!name || !email || !message) {
      return Response.json(
        { message: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    if (!isEmailValid(email)) {
      return Response.json(
        { message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser || recipient;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.info("Contact form submission received without SMTP config.", {
        name,
        email,
        company,
        service,
        message,
      });

      return Response.json({
        message:
          "Message captured. Add SMTP environment variables to deliver emails directly to ceo@hftxai.com.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: recipient,
      replyTo: email,
      subject: `HFTX AI inquiry: ${service}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company}`,
        `Service: ${service}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0b1520;">
          <h2>New HFTX AI Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Service:</strong> ${service}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });

    return Response.json({
      message: "Your message has been sent to the HFTX AI team.",
    });
  } catch (error) {
    console.error("Contact form submission failed.", error);

    return Response.json(
      { message: "We could not send your message right now. Please try again." },
      { status: 500 },
    );
  }
}
