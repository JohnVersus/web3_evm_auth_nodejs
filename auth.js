const express = require("express");
const app = express();
app.use(express.json());

const { readFile } = require("fs").promises;
require("dotenv").config();
const Moralis = require("moralis").default;
const jwt = require("jsonwebtoken");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const port = 8080;
app.listen(port, () => {
  console.log(`App started on port http://localhost:${port} !!!`);
});

app.get("/", async (req, res) => {
  res.send(await readFile("./index.html", "utf8"));
});

const init = async () => {
  await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY,
  });
};
init();

app.post("/requestMessage", async (req, res) => {
  const { address, chain } = req.body;
  console.log({ address, chain });
  const response = await Moralis.Auth.requestMessage({
    networkType: "evm",
    chain,
    address: address,
    domain: "localhost",
    statement: "Sign the message to authenticate",
    uri: "http://localhost:8000/",
    timeout: 60,
  }).catch((e) => {
    return res.status(400).json({ e });
  });

  res.status(200).json({ data: response });
});

app.post("/verifySignature", async (req, res) => {
  const { signature, message } = req.body;
  console.log({ signature, message });
  const response = await Moralis.Auth.verify({
    message,
    signature: signature,
    network: "evm",
  }).catch((e) => {
    return res.status(400).json(e);
  });
  const token = jwt.sign(response.data, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000s",
  });

  res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 60),
    })
    .json({ data: response.data });
});

app.get("/verifyAuth", (req, res) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.json({ auth: false });
    res.json({ auth: true });
  });
});

app.delete("/logout", async (req, res) => {
  res.clearCookie("token");
  res.json({ auth: false });
});
