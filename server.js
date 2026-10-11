const { createAlphaServer } = require("./src/server");

const port = Number(process.env.PORT || 8788);

createAlphaServer({ port }).then((server) => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`AI-DM DnD RPG alpha: http://127.0.0.1:${actualPort}`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
