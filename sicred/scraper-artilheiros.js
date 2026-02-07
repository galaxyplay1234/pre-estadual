const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/Artilharia.aspx";

(async () => {
  try {
    const res = await fetch(URL);
    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 🔹 Campeonato selecionado
    const campeonato =
      document.querySelector("#ctl00_MainContent_ddlCampeonato option[selected]")
        ?.textContent.trim() || "Campeonato";

    if (!campeonato.includes("SICREDI LIVRE MASCULINO")) {
      throw new Error("Campeonato errado carregado");
    }

    // 🔹 Tabela de artilheiros
    const tabela = document.querySelector("#ctl00_MainContent_gdvItens");
    if (!tabela) throw new Error("Tabela de artilheiros não encontrada");

    const artilheiros = [];

    const linhas = tabela.querySelectorAll("tr");

    linhas.forEach((tr, index) => {
      if (index === 0) return; // pula cabeçalho

      const tds = tr.querySelectorAll("td");
      if (tds.length < 3) return;

      artilheiros.push({
        posicao: artilheiros.length + 1,
        nome: tds[0].textContent.trim(),
        clube: tds[1].textContent.trim(),
        gols: parseInt(tds[2].textContent.trim(), 10) || 0
      });
    });

    const dados = {
      campeonato,
      atualizado_em: new Date().toISOString(),
      artilheiros
    };

    fs.writeFileSync(
      "sicred/artilheiros.json",
      JSON.stringify(dados, null, 2),
      "utf-8"
    );

    console.log("✅ artilheiros.json atualizado com sucesso");

  } catch (err) {
    console.error("❌ Erro no scraper de artilheiros:", err.message);
    process.exit(1);
  }
})();