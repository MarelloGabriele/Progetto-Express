"use strict";

import http from "http";
import url from "url";
import fs, { rmSync } from "fs";
import { MongoClient, ObjectId } from "mongodb";
import express, { Request, Response } from "express";
import fileupload, { UploadedFile } from "express-fileupload";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";

import e from "express";

/* ********************** */
//config
dotenv.config({ path: ".env" });
const PORT: number = 1337;
const app = express();
const DB_NAME: string = "5B";
const connectionString: any = process.env.connectionString;

let paginaErrore: string; //strinag che contiene la pagina di errore
//avvio del server

let server = http.createServer(app);

server.listen(PORT, () => {
  init();
  console.log("Server in ascolto sulla porta " + PORT);
});

function init() {
  fs.readFile("../App/error.html", (err: any, data: any) => {
    if (err) paginaErrore = "<h3><b>Risorsa non trovata</b></h3>";
    else paginaErrore = data.toString();
  });
}

/************MIDDLEWARE************/

//1 request log
app.use("/", (req: any, res: any, next: any) => {
  console.log("---> " + req.method + ": " + req.originalUrl);
  next();
});

//2
app.use("/", express.static("./static")); //cerca le risorse nella cartella static

//3
app.use("/", express.json({ limit: "50mb" })); //permette la lettura dei parametri post

app.use("/", express.urlencoded({ limit: "20mb", extended: true }));
//4 upload file binari
app.use("/", fileUpload({ limits: { fileSize: 20 * 1024 * 1024 } }));

//5 log parametri get e post
app.use("/", (req: any, res: any, next: any) => {
  if (Object.keys(req.query).length != 0) {
    //req.query contiene parametri GET
    console.log("---> Parametri GET: " + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length != 0)
    console.log("---> PARAMETRI BODY: " + JSON.stringify(req.body));
  console.log("---> " + req.method + ": " + req.originalUrl);
  next();
});

//6 apertura della connessione
app.use("/api/", (req: any, res: any, next: any) => {
  let connessione = new MongoClient(connectionString);
  connessione
    .connect()
    .catch((err: Error) => {
      res.status(503);
      res.send("Errore connessione database");
      next();
    })
    .then((client: any) => {
      req["connessione"] = client;
      next();
    });
});

/************USER LISTENER************/



/************DEFAULT ROOT************/

app.use("/", (req: any, res: any) => {
  //viene fatta se non vien trovata la risorsa, sia statica che dinamica
  res.status(404);
  if (req.originalUrl.startsWith("/api/")) {
    res.send("API non disponibile");
    req.connessione.close();
  } else res.send(paginaErrore);
});

app.use("/", (err: any, req: any, res: any, next: any) => {
  //viene fatta se non vien trovata la risorsa, sia statica che dinamica
  if (req.connessione) req.connessione.close();
  console.log("ERRORE SERVER: " + err.stack);
  res.status(500);
  res.send(err.message);
});