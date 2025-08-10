import type { Response } from "express";
import { extractExtras } from "../utils/extractExtras.util";
import models from "../models";
import { PaymentStatus } from "../enums/paymentStatus.enum";
import ResendEmail from "../services/resend.service";

interface IntentPaymentBody {
  amount: string;
  state: string;
  id_transaccion: string;
  extras?: string;
  typePayment: string;
  cardType?: string;
  cardInfo?: string;
  bank?: string;
  clientName: string;
  country?: string;
  clientID?: string; 
}

export async function handleIntentPayment(
  body: IntentPaymentBody,
  res: Response,
): Promise<void> {
  try {
    const extras = extractExtras(body.extras);
    const intentId = extras.intentId;

    if (!intentId) {
      console.log("[Webhook - Error]", "No se encontró intentId en extras");
      res.status(400).json({ message: "Extras sin intentId" });
      return;
    }

    console.log(
      "[Webhook - Buscando Intento de Pago]",
      `IntentId: ${intentId}`,
    );
    const intent = await models.paymentsIntents.findOne({ intentId });

    if (!intent) {
      console.log(
        "[Webhook - Error]",
        `Intento no encontrado para id: ${intentId}`,
      );
      res.status(404).json({ message: "Intento de pago no encontrado" });
      return;
    }

    if (intent.state === PaymentStatus.PAID) {
      console.log("[Webhook - Pago Ya Procesado]", `IntentId: ${intentId}`);
      res.status(200).json({ message: "Pago ya procesado previamente" });
      return;
    }

    console.log("[Webhook - Creando Cliente]", {
      nombre: intent.name,
      email: intent.email,
      telefono: intent.phone,
    });

    let cliente = await models.clients.findOne({ email: intent.email });
    let isFirstPayment = false;

    if (!cliente) {
      isFirstPayment = true;
      cliente = await models.clients.create({
        name: intent.name || "Sin nombre",
        email: intent.email,
        phone: intent.phone,
        dateOfBirth: new Date(),
        city: "No especificada",
        country: body.country || "No especificado",
        nationalIdentification: body.clientID || "",
        paymentInfo: {
          preferredMethod:
            body.typePayment === "TRANSFER"
              ? "Transferencia Bancaria"
              : body.typePayment,
          lastPaymentDate: new Date(),
          cardType: body.typePayment === "TRANSFER" ? "N/A" : body.cardType,
          cardInfo: body.typePayment === "TRANSFER" ? "N/A" : body.cardInfo,
          bank: body.bank || "No especificado",
        },
        transactions: [],
      });
    }

    if (cliente && !cliente.nationalIdentification && body.clientID) {
      await models.clients.updateOne(
        { _id: cliente._id },
        { $set: { nationalIdentification: body.clientID } }
      );
    }    

    const transaction = await models.transactions.create({
      transactionId: body.id_transaccion,
      intentId,
      amount: parseFloat(body.amount),
      paymentMethod:
        body.typePayment === "TRANSFER"
          ? "Transferencia Bancaria"
          : body.typePayment,
      cardInfo: body.typePayment === "TRANSFER" ? "N/A" : body.cardInfo,
      cardType: body.typePayment === "TRANSFER" ? "N/A" : body.cardType,
      bank: body.bank || "No especificado",
      date: new Date(),
      description: intent.description,
      clientId: cliente._id,
    });

    await models.clients.updateOne(
      { _id: cliente._id },
      {
        $push: { transactions: transaction._id },
        $set: {
          "paymentInfo.lastPaymentDate": new Date(),
          "paymentInfo.preferredMethod":
            body.typePayment === "TRANSFER"
              ? "Transferencia Bancaria"
              : body.typePayment,
          "paymentInfo.cardType":
            body.typePayment === "TRANSFER" ? "N/A" : body.cardType,
          "paymentInfo.cardInfo":
            body.typePayment === "TRANSFER" ? "N/A" : body.cardInfo,
          "paymentInfo.bank": body.bank || "No especificado",
        },
      },
    );

    let business = await models.business.findOne({ name: intent.businessName });

    if (!business && isFirstPayment) {
      business = await models.business.create({
        name: intent.businessName,
        email: intent.email,
        phone: intent.phone,
        address: "Sin dirección",
        owner: cliente._id,
      });

      await models.clients.updateOne(
        { _id: cliente._id },
        { $push: { businesses: business._id } },
      );

      console.log(
        "[Webhook - Nuevo Negocio Creado]",
        `Negocio: ${business.name}`,
      );
    } else if (business) {
      console.log(
        "[Webhook - Negocio Existente]",
        `Negocio: ${business.name}, Cliente: ${cliente.name}`,
      );
    }

    await models.paymentsIntents.updateOne(
      { intentId },
      {
        $set: {
          state: PaymentStatus.PAID,
          transactionId: body.id_transaccion,
          paidAt: new Date(),
          userId: cliente._id,
          businessId: business?._id,
        },
      },
    );

    const resendService = new ResendEmail();
    try {
      if (isFirstPayment) {
        await resendService.sendOnboardingEmail(
          intent.email!,
          cliente.name,
          cliente.id,
          business?.id,
        );
        console.log(
          "[Webhook - Email de Onboarding Enviado]",
          `Cliente: ${cliente.name}`,
        );
      } else {
        await resendService.sendPaymentConfirmationEmail(
          intent.email!,
          cliente.name,
          intent.businessName,
        );
        console.log(
          "[Webhook - Email de Confirmación Enviado]",
          `Cliente: ${cliente.name}`,
        );
      }
    } catch (emailError) {
      console.error("[Webhook - Error al enviar email]", emailError);
    }

    const responseMessage = isFirstPayment
      ? "Bienvenido! Tu primer pago ha sido registrado exitosamente. Te enviaremos la información de onboarding por correo."
      : `Gracias por tu pago adicional para ${intent.businessName}. La transacción ha sido registrada exitosamente.`;

    console.log("[Webhook - Proceso Completado]", `IntentId: ${intentId}`);
    res.status(200).json({ message: responseMessage, isFirstPayment });
  } catch (error) {
    console.error("[Webhook - Error Interno]", error);
    res.status(500).json({ message: "Error procesando el pago con intentId" });
  }
}
