import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "https://hkqzzxgeedsmjnhyquke.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/uber-webhook`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const signPayload = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

const getLatestUberConfig = async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/plataformas_configuracao?plataforma=eq.uber&select=id,client_secret&order=updated_at.desc.nullslast,created_at.desc.nullslast&limit=1`, {
    headers: serviceHeaders,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Falha ao obter integração Uber: ${JSON.stringify(body)}`);
  }

  if (!Array.isArray(body) || body.length === 0) {
    throw new Error("Nenhuma integração Uber encontrada para teste");
  }

  return body[0] as { id: string; client_secret: string };
};

const sendSignedWebhook = async (config: { id: string; client_secret: string }, payloadObject: Record<string, unknown>) => {
  const payload = JSON.stringify(payloadObject);
  const signature = await signPayload(config.client_secret, payload);

  return fetch(`${FUNCTION_URL}?integracao_id=${config.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "x-uber-signature": `sha256=${signature}`,
      "x-environment": "sandbox",
    },
    body: payload,
  });
};

// ─── Assinatura ───

Deno.test("uber-webhook rejeita assinatura inválida", async () => {
  const config = await getLatestUberConfig();
  const payload = JSON.stringify({ event_id: crypto.randomUUID(), event_type: "driver.updated", meta: {} });

  const response = await fetch(`${FUNCTION_URL}?integracao_id=${config.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "x-uber-signature": "sha256=assinatura-invalida",
    },
    body: payload,
  });

  const body = await response.json();
  assertEquals(response.status, 401);
  assertEquals(body.success, false);
});

// ─── Evento genérico (sem dados úteis no meta) ───

Deno.test("uber-webhook ignora payload genérico com meta vazio", async () => {
  const config = await getLatestUberConfig();
  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "driver.updated",
    meta: {},
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.processing_status, "ignored");
  assert(typeof (body.diagnostics_summary ?? body.message) === "string");
});

// ─── Motorista via meta (formato oficial Uber) ───

Deno.test("uber-webhook processa motorista no formato meta oficial", async () => {
  const config = await getLatestUberConfig();
  const uberDriverId = `drv-meta-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "driver.updated",
    meta: {
      driverId: uberDriverId,
      firstName: "Carlos",
      lastName: "Mendes",
      email: `carlos.${crypto.randomUUID()}@example.com`,
      phone: { countryCode: "+351", number: "912345678" },
      status: "active",
      city: "Porto",
      rating: 4.88,
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.domain, "driver");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.drivers.inserted, 1);

  // Verificar na BD
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_drivers?integracao_id=eq.${config.id}&uber_driver_id=eq.${encodeURIComponent(uberDriverId)}&select=uber_driver_id,full_name,status,flow_type&limit=1`,
    { headers: serviceHeaders },
  );
  const verifyBody = await verifyRes.json();
  assertEquals(verifyBody.length, 1);
  assertEquals(verifyBody[0].uber_driver_id, uberDriverId);
  assertEquals(verifyBody[0].full_name, "Carlos Mendes");
  assertEquals(verifyBody[0].status, "active");
  assertEquals(verifyBody[0].flow_type, "webhook");
});

// ─── Motorista via resource.driver (formato alternativo) ───

Deno.test("uber-webhook processa motorista via resource.driver", async () => {
  const config = await getLatestUberConfig();
  const uberDriverId = `drv-res-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "driver.updated",
    resource: {
      driver: {
        driverId: uberDriverId,
        firstName: "João",
        lastName: "Silva",
        email: `joao.${crypto.randomUUID()}@example.com`,
        phone: { countryCode: "+351", number: "912345678" },
        status: "active",
        city: "Lisboa",
        rating: 4.95,
      },
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.domain, "driver");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.drivers.inserted, 1);
});

// ─── Viatura via meta (formato oficial) ───

Deno.test("uber-webhook processa viatura via meta", async () => {
  const config = await getLatestUberConfig();
  const uberVehicleId = `veh-meta-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "vehicle.updated",
    meta: {
      vehicleId: uberVehicleId,
      licensePlate: "XX99YY",
      make: "Tesla",
      model: "Model 3",
      year: 2024,
      status: "active",
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.domain, "vehicle");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.vehicles.inserted + body.counts.vehicles.updated, 1);
});

// ─── Viatura via resource.vehicle ───

Deno.test("uber-webhook processa viatura via resource.vehicle", async () => {
  const config = await getLatestUberConfig();
  const uberVehicleId = `veh-res-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "vehicle.updated",
    resource: {
      vehicle: {
        vehicleId: uberVehicleId,
        licensePlate: "AA12BB",
        status: "active",
      },
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.domain, "vehicle");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.vehicles.inserted + body.counts.vehicles.updated, 1);
});

// ─── Transação via meta (formato oficial) ───

Deno.test("uber-webhook processa transação via meta", async () => {
  const config = await getLatestUberConfig();
  const uberTransactionId = `txn-meta-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "payment.created",
    meta: {
      paymentId: uberTransactionId,
      tripId: `trip-${crypto.randomUUID()}`,
      driverId: `drv-${crypto.randomUUID()}`,
      vehicleId: `veh-${crypto.randomUUID()}`,
      grossAmount: { amount: 32.5, currencyCode: "EUR" },
      netAmount: { amount: 26.0 },
      commissionAmount: { amount: 6.5 },
      occurredAt: new Date().toISOString(),
      status: "settled",
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.domain, "transaction");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.transactions.inserted, 1);

  // Verificar na BD
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/uber_transactions?integracao_id=eq.${config.id}&uber_transaction_id=eq.${encodeURIComponent(uberTransactionId)}&select=uber_transaction_id,currency,gross_amount,net_amount,commission_amount,status&limit=1`,
    { headers: serviceHeaders },
  );
  const verifyBody = await verifyRes.json();
  assertEquals(verifyBody.length, 1);
  assertEquals(verifyBody[0].uber_transaction_id, uberTransactionId);
  assertEquals(verifyBody[0].currency, "EUR");
  assertEquals(verifyBody[0].gross_amount, 32.5);
  assertEquals(verifyBody[0].net_amount, 26.0);
  assertEquals(verifyBody[0].commission_amount, 6.5);
  assertEquals(verifyBody[0].status, "settled");
});

// ─── Transação via data.payment (formato alternativo) ───

Deno.test("uber-webhook processa transação via data.payment", async () => {
  const config = await getLatestUberConfig();
  const uberTransactionId = `txn-data-${crypto.randomUUID()}`;

  const payloadObject = {
    event_id: crypto.randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    event_type: "payment.created",
    data: {
      payment: {
        paymentId: uberTransactionId,
        tripId: `trip-${crypto.randomUUID()}`,
        driverId: `drv-${crypto.randomUUID()}`,
        grossAmount: { amount: 27.5, currencyCode: "EUR" },
        netAmount: { amount: 22.1 },
        commissionAmount: { amount: 5.4 },
        occurredAt: new Date().toISOString(),
        status: "settled",
      },
    },
  };

  const response = await sendSignedWebhook(config, payloadObject);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.domain, "transaction");
  assertEquals(body.processing_status, "processed");
  assertEquals(body.counts.transactions.inserted, 1);
});
