const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/ClassificacaoJogos.aspx";

(async () => {
  const res = await fetch(URL);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  /* ================= CAMPEONATO ================= */
  const campeonato = [...document.querySelectorAll("h3.title-bg")]
    .find(h => h.textContent.includes("SICREDI LIVRE MASCULINO"))
    ?.textContent.trim();

  /* ================= CLASSIFICAÇÃO ================= */
  const grupos = [];

  document.querySelectorAll(".label-grupo").forEach(label => {
    const nomeGrupo = label.textContent.replace("Grupo:", "").trim();
    const tabela = label.nextElementSibling?.querySelector("table");
    if (!tabela) return;

    const times = [];

    tabela.querySelectorAll("tr").forEach((tr, i) => {
      if (i === 0) return;
      const td = tr.querySelectorAll("td");
      if (td.length < 11) return;

      times.push({
        posicao: Number(td[0].textContent.trim()),
        logo: td[1].querySelector("img")?.getAttribute("src") || "",
        nome: td[2].textContent.trim(),
        pontos: Number(td[3].textContent),
        jogos: Number(td[4].textContent),
        vitorias: Number(td[5].textContent),
        empates: Number(td[6].textContent),
        derrotas: Number(td[7].textContent),
        gols_pro: Number(td[8].textContent),
        gols_contra: Number(td[9].textContent),
        saldo: Number(td[10].textContent)
      });
    });

    grupos.push({ nome: nomeGrupo, tabela: times });
  });

  /* ================= JOGOS ================= */
  const jogosPorRodada = [];
  let rodadaAtual = null;

  const rows = document.querySelectorAll("table tr");

  rows.forEach(tr => {
    const texto = tr.textContent.replace(/\s+/g, " ").trim();

    // Detecta "Rodada X"
    if (texto.startsWith("Rodada")) {
      rodadaAtual = {
        rodada: texto,
        jogos: []
      };
      jogosPorRodada.push(rodadaAtual);
      return;
    }

    if (!rodadaAtual) return;

    const tds = tr.querySelectorAll("td");
    if (tds.length < 6) return;

    const mandante = tds[1]?.textContent.trim();
    const visitante = tds[3]?.textContent.trim();

    if (!mandante || !visitante) return;

    rodadaAtual.jogos.push({
      mandante,
      visitante,
      logo_mandante: tds[0]?.querySelector("img")?.getAttribute("src") || "",
      logo_visitante: tds[4]?.querySelector("img")?.getAttribute("src") || "",
      gols_mandante: null,
      gols_visitante: null,
      campo: tds[5]?.textContent.trim() || "",
      data: tds[6]?.textContent.trim() || "",
      hora: tds[7]?.textContent.trim() || ""
    });
  });

  /* ================= SALVA ================= */
  const dados = {
    campeonato,
    grupos,
    jogos: jogosPorRodada
  };

  fs.writeFileSync("sicred/dados.json", JSON.stringify(dados, null, 2));
  console.log("✅ dados.json atualizado com classificação + jogos");
})();