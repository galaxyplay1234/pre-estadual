const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/JogosCampeonato.aspx";
const BASE = "https://www.lchf.com.br";

(async () => {
  const res = await fetch(URL);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // 🔹 Confere campeonato selecionado
  const campeonatoSelect = document.querySelector(
    "#ctl00_MainContent_ddlCampeonato option[selected]"
  );

  const campeonato = campeonatoSelect
    ? campeonatoSelect.textContent.trim()
    : "Campeonato";

  if (!campeonato.includes("SICREDI LIVRE MASCULINO")) {
    throw new Error("Campeonato errado carregado");
  }

  // 🔹 Rodada atual
  const rodada =
    document.querySelector("#ctl00_MainContent_lblRodada")
      ?.textContent.trim() || "";

  // 🔹 Tabela de jogos
  const tabela = document.querySelector("table.point-table");
  if (!tabela) throw new Error("Tabela de jogos não encontrada");

  const jogos = [];

  tabela.querySelectorAll("tr").forEach((tr, i) => {
    if (i === 0) return; // cabeçalho

    const td = tr.querySelectorAll("td");
    if (td.length < 6) return;

    const golsCasa =
      td[2].querySelector("input:first-child")?.value || "";
    const golsFora =
      td[2].querySelector("input:last-child")?.value || "";

    jogos.push({
      mandante: td[1].textContent.trim(),
      visitante: td[3].textContent.trim(),
      gols_mandante: golsCasa || null,
      gols_visitante: golsFora || null,
      campo: td[4].textContent.trim(),
      data_hora: td[5].textContent.trim()
    });
  });

  const dados = {
    campeonato,
    rodada,
    jogos
  };

  fs.writeFileSync(
    "sicred/jogos.json",
    JSON.stringify(dados, null, 2),
    "utf-8"
  );

  console.log("✅ jogos.json atualizado com sucesso");
})();