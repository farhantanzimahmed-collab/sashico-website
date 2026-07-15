"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, MapPin, Clock, Instagram, Facebook } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

const schema = z.object({
  name:    z.string().min(2, "Name is required"),
  email:   z.string().email("Valid email required"),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormData = z.infer<typeof schema>;

const DEFAULT_INFO = {
  heading: "Get In Touch",
  body: "Have a question about an order, a product, or just want to say hello — we're here for it.",
  email: "hello@sashico.com",
  phone: "+880 1700-000000",
  address: "Dhaka, Bangladesh",
  hours: "Mon–Sat, 10am–6pm",
};

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [info, setInfo] = useState(DEFAULT_INFO);

  useEffect(() => {
    fetch("/api/page-content?slug=contact")
      .then((r) => r.json())
      .then((d) => { if (d?.content) setInfo((prev) => ({ ...prev, ...d.content })); })
      .catch(() => {});
  }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSubmitted(true);
      reset();
      toast.success("Message sent!");
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const contactItems = [
    { icon: Mail, label: "Email", value: info.email, href: `mailto:${info.email}` },
    { icon: Phone, label: "Phone / WhatsApp", value: info.phone, href: `tel:${info.phone?.replace(/\s|-/g, "")}` },
    { icon: MapPin, label: "Location", value: info.address, href: null },
    { icon: Clock, label: "Hours", value: info.hours, href: null },
  ].filter((i) => i.value);

  return (
    <div className="pt-24 sm:pt-28 pb-20">
      {/* Header */}
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl">
          <p className="label-xs text-brand-gray-500 mb-4">Get In Touch</p>
          <h1 className="display-heading text-[clamp(2.5rem,8vw,6rem)] text-white leading-none">{info.heading}</h1>
        </div>
      </div>

      <div className="container-xl py-12 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Info */}
          <div className="space-y-8 sm:space-y-10">
            <div>
              <p className="text-sm text-brand-gray-600 font-sans leading-relaxed">{info.body}</p>
            </div>

            <div className="space-y-5">
              {contactItems.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-brand-gray-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-brand-gray-600" />
                  </div>
                  <div>
                    <p className="label-xs text-brand-gray-400">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-sm font-sans text-brand-black hover:text-brand-gray-600 transition-colors mt-1 block break-all">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-sans text-brand-black mt-1">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="label-xs text-brand-gray-400 mb-4">Follow Us</p>
              <div className="flex gap-4">
                <a href="#" className="flex items-center gap-2 text-sm font-sans text-brand-black hover:text-brand-gray-500 transition-colors">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                <a href="#" className="flex items-center gap-2 text-sm font-sans text-brand-black hover:text-brand-gray-500 transition-colors">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-14 sm:py-16 bg-brand-gray-50 border border-brand-gray-100">
                <div className="h-12 w-12 bg-brand-black text-white flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-semibold text-brand-black mb-2">Message Received!</h3>
                <p className="text-sm text-brand-gray-600 font-sans">We'll get back to you within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 label-xs text-brand-black underline underline-offset-4">
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <Input label="Your Name" {...register("name")} error={errors.name?.message} placeholder="Full name" />
                  <Input label="Email" type="email" {...register("email")} error={errors.email?.message} placeholder="your@email.com" />
                </div>
                <Input label="Subject" {...register("subject")} error={errors.subject?.message} placeholder="How can we help?" />
                <div>
                  <label className="mb-1.5 block label-xs text-brand-gray-700">Message</label>
                  <textarea
                    {...register("message")}
                    rows={6}
                    placeholder="Write your message here..."
                    className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none transition-colors"
                  />
                  {errors.message && <p className="mt-1.5 text-xs text-red-600">{errors.message.message}</p>}
                </div>
                <Button type="submit" loading={submitting} fullWidth size="lg">Send Message</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
