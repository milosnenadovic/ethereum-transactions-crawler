const request = require("request");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/pretrazi", (req, res) => {
  const { id } = req.body;
  const { blok } = req.body;

  request(
    {
      uri: `https://etherscan.io/txs?a=${id}`,
    },
    async (error, response, body) => {
      if (error) {
        res.sendFile(path.join(__dirname, "index.html"));
      }
      try {
        let $ = cheerio.load(body);
        let last =
          $('nav[aria-label="page navigation"]')
            .find("ul > li")
            .eq(4)
            .find("a")
            .attr("href") || 1;
        if (last != 1) last = parseInt(last.split("&p=")[1]);
        let html = fs.createWriteStream(__dirname + "/tabela.html");
        let style =
          "<style> \r\n" +
          "body {text-align: center;} \r\n" +
          "table {border-collapse: collapse; margin: auto; font-size: 0.9em; min-width: 400px; border-radius: 5px 5px 0 0; overflow: hidden; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);} \r\n" +
          "table thead tr {background-color: #009879; color: #ffffff; text-align: left; font-weight: bold; font-family: verdana} \r\n" +
          "table thead th {padding: 12px 16px;} \r\n" +
          "table tbody tr {border-bottom: 1px solid #dddddd;} \r\n" +
          "table tbody tr td, h1, a {padding: 4px 8px; font-family: verdana;} \r\n" +
          "table tbody tr:nth-of-type(even) {background-color: #f3f3f3;} \r\n" +
          "table tbody tr:last-of-type {border-bottom: #009879;} \r\n" +
          "</style> \r\n";
        let thead =
          "<table><thead><tr><th>Block</th><th>Age</th><th>From</th><th>To</th><th>Value (Ether)</th></tr></thead><tbody>";
        let uvod =
          style + `<a href="/">Nazad</a><h1>Adresa: ${id}</h1> \r\n` + thead;
        html.write(uvod);
        for (let i = 1; i <= last; i++) {
          let uri = `https://etherscan.io/txs?a=${id}&p=${i}`;
          let str = "";
          let response = await axios.get(
            `https://etherscan.io/txs?a=${id}&p=${i}`
          );
          if (!response) {
            html.write("</tbody></table>", (err) => {
              if (err) {
                console.log(err);
              } else {
                res.sendFile(path.join(__dirname, "/tabela.html"));
              }
            });
            console.log("Nema response-a: " + uri);
          }

          let $ = cheerio.load(response.data);
          $("tbody > tr").each(function () {
            let block = $(this).find("td").eq(2);
            if (parseInt(block.text()) < parseInt(blok)) {
              i = last;
            } else {
              let age = $(this).find("td").eq(4);
              let from = $(this).find("td").eq(5);
              let to = $(this).find("td").eq(7);
              let value = $(this).find("td").eq(8);
              let tr =
                "<tr><td>" +
                block.text() +
                "</td><td>" +
                age.text() +
                "</td><td>" +
                from.text() +
                "</td><td>" +
                to.text() +
                "</td><td>" +
                value.text().split(" Ether")[0] +
                "</td></tr>" +
                "\r\n";
              str += tr;
            }
          });
          if (str.length > 0) html.write(str);
          let tabela = fs.createReadStream(
            path.join(__dirname, "/tabela.html"),
            "utf-8"
          );
          if (i === last) {
            html.write('</tbody></table><br/><a href="/">Nazad</a>', (err) => {
              if (err) {
                console.log(err);
              } else {
                tabela.pipe(res);
              }
            });
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  );
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server je pokrenut na portu: " + PORT));
