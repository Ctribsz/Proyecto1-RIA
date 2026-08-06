import { defineString } from "firebase-functions/params";

export const allowedIps = defineString("ALLOWED_IPS", {
  description: "IPs públicas autorizadas, separadas por comas.",
  input: {
    text: {
      example: "203.0.113.10,198.51.100.20",
      nonEmpty: true,
    },
  },
});

export const functionRegion = "us-central1";
