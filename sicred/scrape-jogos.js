const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/JogosCampeonato.aspx";

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Mozilla/5.0"
};

async function getPage(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

function getHidden(document, name) {
  return document.querySelector(`input[name="${name}"]`)?.value || "";
}

function parseJogos(document) {
  const tabela = document.querySelector("table.point-table");
  if (!tabela) return [];

  const jogos = [];

  tabela.querySelectorAll("tr").forEach((tr, i) => {
    if (i === 0) return;

    const td = tr.querySelectorAll("td");
    if (td.length < 6) return;

    const inputs = td[2].querySelectorAll("input");

    jogos.push({
      mandante: td[1].textContent.trim(),
      visitante: td[3].textContent.trim(),
      gols_mandante: inputs[0]?.value ? Number(inputs[0].value) : null,
      gols_visitante: inputs[1]?.value ? Number(inputs[1].value) : null,
      campo: td[4].textContent.trim(),
      data_hora: td[5].textContent.trim()
    });
  });

  return jogos;
}

(async () => {
  console.log("▶ Iniciando scrape de jogos…");

  // 1️⃣ GET inicial
  let res = await fetch(URL, { headers: HEADERS });
  let html = await res.text();
  let document = await getPage(html);

  // Campeonato
  const campeonato = document
    .querySelector("#ctl00_MainContent_ddlCampeonato option[selected]")
    ?.textContent.trim() || "Campeonato";

  if (!campeonato.includes("SICREDI LIVRE MASCULINO")) {
    throw new Error("❌ Campeonato errado carregado");
  }

  let lblRodada = document.querySelector("#ctl00_MainContent_lblRodada")
  ?.textContent.trim();

const totalRodadas = Number(lblRodada?.match(/de\s+(\d+)/)?.[1] || 1);
const rodadaAtual = Number(lblRodada?.match(/Rodada\s+(\d+)/)?.[1] || 1);

  const rodadas = [];
  
  
  // 🔥 VOLTA PARA A PRIMEIRA RODADA
while (!lblRodada.includes("Rodada 1")) {

  const body = new URLSearchParams({
    "__EVENTTARGET": "ctl00$MainContent$Button1", // botão "<"
    "__EVENTARGUMENT": "",
    "__VIEWSTATE": getHidden(document, "__VIEWSTATE"),
    "__VIEWSTATEGENERATOR": getHidden(document, "__VIEWSTATEGENERATOR"),
    "__EVENTVALIDATION": getHidden(document, "__EVENTVALIDATION"),
    "ctl00$MainContent$ddlCampeonato":
      document.querySelector("#ctl00_MainContent_ddlCampeonato")?.value || ""
  }).toString();

  const resBack = await fetch(URL, {
    method: "POST",
    headers: HEADERS,
    body
  });

  html = await resBack.text();
  document = await getPage(html);

  lblRodada = document.querySelector("#ctl00_MainContent_lblRodada")
    ?.textContent.trim();
}
  

  // 2️⃣ Loop das rodadas
  for (let i = 1; i <= totalRodadas; i++) {
    console.log(`➡ Lendo Rodada ${i}`);

    document = await getPage(html);

    const nomeRodada = document.querySelector("#ctl00_MainContent_lblRodada")
      ?.textContent.trim() || `Rodada ${i}`;

    const jogos = parseJogos(document);

    rodadas.push({
      nome: nomeRodada,
      jogos
    });

    // Se for a última, não avança
    if (i === totalRodadas) break;

    // 3️⃣ POST simulando botão ">"
    const body = new URLSearchParams({
      "__EVENTTARGET": "ctl00$MainContent$Button2",
      "__EVENTARGUMENT": "",
      "__VIEWSTATE": getHidden(document, "__VIEWSTATE"),
      "__VIEWSTATEGENERATOR": getHidden(document, "__VIEWSTATEGENERATOR"),
      "__EVENTVALIDATION": getHidden(document, "__EVENTVALIDATION"),
      "ctl00$MainContent$ddlCampeonato":
        document.querySelector("#ctl00_MainContent_ddlCampeonato")?.value || ""
    }).toString();

    res = await fetch(URL, {
      method: "POST",
      headers: HEADERS,
      body
    });

    html = await res.text();
  }

  // 4️⃣ Salva JSON final
  const output = {
  campeonato,
  rodada_atual: rodadaAtual,
  rodadas
};

  fs.writeFileSync(
    "sicred/jogos.json",
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  console.log("✅ jogos.json gerado com TODAS as rodadas");
})();