"use client";

import { FormEvent, useState, useTransition } from "react";
import styles from "./ContactForm.module.css";

const initialState = {
  name: "",
  email: "",
  company: "",
  service: "AI Trading Application",
  message: "",
};

type FormState = typeof initialState;

type ContactFormProps = {
  whatsappHref: string;
};

export default function ContactForm({ whatsappHref }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Unable to submit your request.");
        }

        setStatus(result.message || "Your message has been sent.");
        setForm(initialState);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while sending your message.";
        setStatus(message);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Your full name"
          />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="name@company.com"
          />
        </label>

        <label className={styles.field}>
          <span>Company</span>
          <input
            value={form.company}
            onChange={(event) =>
              setForm((current) => ({ ...current, company: event.target.value }))
            }
            placeholder="Company or brand"
          />
        </label>

        <label className={styles.field}>
          <span>Service</span>
          <select
            value={form.service}
            onChange={(event) =>
              setForm((current) => ({ ...current, service: event.target.value }))
            }
          >
            <option>AI Trading Application</option>
            <option>Algo & News Strategy</option>
            <option>Prop Firm Technology</option>
            <option>White-Label Trading Solution</option>
            <option>Market Data / Analysis / Risk</option>
            <option>Marketing & Web Design</option>
            <option>Hire Software Developers</option>
            <option>General Support</option>
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span>Project or support details</span>
        <textarea
          required
          rows={6}
          value={form.message}
          onChange={(event) =>
            setForm((current) => ({ ...current, message: event.target.value }))
          }
          placeholder="Tell us what you want to build, improve, or support."
        />
      </label>

      <div className={styles.actions}>
        <div className={styles.primaryActions}>
          <button className={styles.submit} disabled={isPending} type="submit">
            {isPending ? "Sending..." : "Send Inquiry"}
          </button>
          <a
            className={styles.whatsapp}
            href={whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            WhatsApp Support
          </a>
        </div>
        <p className={styles.note}>
          Direct email: <a href="mailto:ceo@hftxai.com">ceo@hftxai.com</a>
        </p>
      </div>

      {status ? <p className={styles.status}>{status}</p> : null}
    </form>
  );
}
