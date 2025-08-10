import { Response } from "express";
import models from "../models";
import ResendEmail from "../services/resend.service";
import { BusinessTypeEnum } from "../enums/businessType.enum";

export enum PayMethod {
  PAGOPLUX = "pagoplux",
  BANK_TRANSFER = "bank transfer",
  DATIL = "datil",
}

export interface ManualPaymentBody {
  amount: string;
  clientName: string;
  clientId?: string;
  email: string;
  phone: string;
  description?: string;
  country?: string;
  bank?: string;
  businessName: string;
  businessType: BusinessTypeEnum;
  paymentMethod: PayMethod;
}

export async function handleManualPayment(
  body: ManualPaymentBody,
  res: Response,
): Promise<void> {
  try {
    const paymentMethodString =
      body.paymentMethod === PayMethod.BANK_TRANSFER
        ? "Transferencia Bancaria"
        : "Dátil";
    const bankProvider = body.bank || "No especificado";
    const intentId =
      body.paymentMethod === PayMethod.BANK_TRANSFER
        ? "TRANSFER-MANUAL"
        : "DATIL-MANUAL";
    const transactionId = `${intentId}-${Date.now()}-${
      body.clientId?.slice(-4) || "XXXX"
    }`;

    let cliente = await models.clients.findOne({ email: body.email });
    let isFirstPayment = false;

    if (!cliente) {
      isFirstPayment = true;
      cliente = await models.clients.create({
        name: body.clientName,
        email: body.email,
        phone: body.phone,
        dateOfBirth: new Date(),
        city: "No especificada",
        nationalIdentification: body.clientId || "",
        country: body.country || "No especificado",
        paymentInfo: {
          preferredMethod: paymentMethodString,
          lastPaymentDate: new Date(),
          bank: bankProvider,
        },
        transactions: [],
        businesses: [],
      });
    } else if (body.clientId && !cliente.nationalIdentification) {
      cliente.nationalIdentification = body.clientId;
      await cliente.save();
    }

    let business;
    let wasNewBusinessCreated = false;

    if (
      !body.businessType ||
      !Object.values(BusinessTypeEnum).includes(body.businessType)
    ) {
      res.status(400).send({
        message: `The business type '${body.businessType}' is not valid.`,
      });
      return;
    }

    business = await models.business.findOne({
      owner: cliente._id,
      name: body.businessName,
    });

    if (!business) {
      try {
        business = await models.business.create({
          name: body.businessName,
          businessType: body.businessType,
          owner: cliente._id,
          ruc: null,
          email: body.email,
          phone: body.phone,
          address: "Sin dirección",
        });
        wasNewBusinessCreated = true;

        await models.clients.updateOne(
          { _id: cliente._id },
          { $push: { businesses: business._id } },
        );

        const resendService = new ResendEmail();
        await resendService.sendPoliciesEmail(cliente.name, cliente.email);

      } catch (error: any) {
        if (error.code === 11000 && error.keyPattern?.ruc) {
            console.warn(`[Manual Payment] Conflict: Attempted to create a business with duplicate RUC: ${error.keyValue.ruc}`);
            res.status(409).json({ message: `The RUC '${error.keyValue.ruc}' is already registered by another business in the system.` });
            return;
        }
        throw error;
      }
    }

    const transaction = await models.transactions.create({
      transactionId,
      intentId,
      amount: parseFloat(body.amount),
      paymentMethod: paymentMethodString,
      bank: bankProvider,
      date: new Date(),
      description: body.description || "Sin descripción",
      clientId: cliente._id,
    });

    await models.clients.updateOne(
      { _id: cliente._id },
      { $push: { transactions: transaction._id } },
    );

    const resendService = new ResendEmail();
    try {
      if (isFirstPayment || wasNewBusinessCreated) {
        await resendService.sendOnboardingEmail(
          body.email,
          body.clientName,
          cliente.id,
          business?.id,
        );
      } else {
        await resendService.sendPaymentConfirmationEmail(
          body.email,
          body.clientName,
          body.businessName,
        );
      }
    } catch (emailError) {
      console.error("[Manual Payment] Error sending email:", emailError);
    }

    let responseMessage = `Thank you for your payment to '${body.businessName}'. Transaction recorded.`;
    if (wasNewBusinessCreated && !isFirstPayment) {
      responseMessage = `Payment recorded and new business created: '${body.businessName}'. 
      Onboarding email coming soon.`;
    }
    if (isFirstPayment) {
      responseMessage = `Welcome! First payment recorded and '${body.businessName}' created. 
      Check email for details.`;
    }

    res.status(200).json({
      message: responseMessage,
      isFirstPayment,
      wasNewBusinessCreated,
      transactionId,
      clientId: cliente._id,
      businessId: business?._id,
    });
  } catch (error) {
    console.error("[Manual Payment - Error Interno Fatal]", error);
    res.status(500).json({
      message: "Internal server error while processing manual payment.", error
    });
  }
}