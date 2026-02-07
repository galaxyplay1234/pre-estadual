const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/Artilharia.aspx";

(async () => {
  try {
    // 1️⃣ GET inicial para capturar VIEWSTATE
    const resGet = await fetch(URL);
    const htmlGet = await resGet.text();
    const domGet = new JSDOM(htmlGet);
    const docGet = domGet.window.document;

    const viewstate = docGet.querySelector("#__VIEWSTATE")?.value;
    const eventvalidation = docGet.querySelector("#__EVENTVALIDATION")?.value;
    const viewstategenerator = docGet.querySelector("#__VIEWSTATEGENERATOR")?.value;

    if (!viewstate || !eventvalidation) {
      throw new Error("VIEWSTATE não encontrado");
    }

    // 2️⃣ POST simulando o botão "Selecionar"
    const formData = new URLSearchParams();
    formData.append("__VIEWSTATE", viewstate);
    formData.append("__VIEWSTATEGENERATOR", viewstategenerator);
    formData.append("__EVENTVALIDATION", eventvalidation);
    formData.append("ctl00$MainContent$ddlCampeonato", "167"); // SICREDI LIVRE MASCULINO
    formData.append("ctl00$MainContent$btnSelecionar", "Selecionar");

    const resPost = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    const htmlPost = await resPost.text();
    const dom = new JSDOM(htmlPost);
    const document = dom.window.document;

    const tabela = document.querySelector("#ctl00_MainContent_gdvItens");
    if (!tabela) throw new Error("Tabela não encontrada após POST");

    const artilheiros = [];

    tabela.querySelectorAll("tr").forEach((tr, i) => {
      if (i === 0) return;

      const tds = tr.querySelectorAll("td");
      if (tds.length < 3) return;

      artilheiros.push({
        posicao: artilheiros.length + 1,
        nome: tds[0].textContent.trim(),
        clube: tds[1].textContent.trim(),
        gols: Number(tds[2].textContent.trim()) || 0
      });
    });

    const dados = {
      campeonato: "6ª COPA SICREDI LIVRE MASCULINO",
      atualizado_em: new Date().toISOString(),
      artilheiros
    };

    fs.writeFileSync(
      "sicred/artilheiros.json",
      JSON.stringify(dados, null, 2),
      "utf-8"
    );

    console.log("✅ artilheiros.json gerado com sucesso");

  } catch (err) {
    console.error("❌ Erro no scraper de artilheiros:", err.message);
    process.exit(1);
  }
})();