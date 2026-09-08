export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' parameter", { status: 400 });
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });

    // Remove headers that might cause issues
    modifiedRequest.headers.delete("Origin");
    modifiedRequest.headers.delete("Referer");

    try {
      const response = await fetch(modifiedRequest);
      const modifiedResponse = new Response(response.body, response);
      
      modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
      
      return modifiedResponse;
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  },
};
