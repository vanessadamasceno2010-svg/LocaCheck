import { supabase } from "../supabaseClient";

export async function createPushinPayPix(planId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      success: false,
      message: "Você precisa estar logado para comprar créditos.",
    };
  }

  const response = await fetch("/api/pushinpay/create-pix", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      planId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || "Erro ao gerar PIX.",
    };
  }

  return data;
}