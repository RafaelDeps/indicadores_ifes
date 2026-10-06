#!/usr/bin/env python3
"""Portão de governança: decide se os insumos brutos podem ser publicados.

Feature 016, FR-016. Contrato:
`specs/016-download-data-files/contracts/pagina-downloads.md` §C-2 e §C-5.

Este verificador é diferente dos outros do repositório em um aspecto: a falha
mais barata dele é **não** falhar. Um `check_dados.py` que não roda deixa o
pacote sem validação; este que não roda deixa de publicar dado pessoal, que é o
efeito desejado. Por isso o comportamento em dúvida é sempre fechar o portão:

- registro de pendências ausente, ilegível ou sem a chave `pendencias` ⇒ ERRO
  + exit 1, porque o portão não tem como avaliar e fingir que "tudo certo" seria
  publicar sem avaliação;
- pendência sem `registro`, com `registro` vazio, ou com `registro` que resolve
  para fora da raiz do repositório ⇒ **não resolvida**, nunca resolvida por
  omissão (P-4);
- `registro` que existe mas não contém a string exigida por `contem` ⇒ **não
  resolvida** (Gg-5). É o caso da constitution: o arquivo existe desde a versão
  1.1.0 e continua existindo na 2.0.0, então a existência sozinha não distingue
  "amendada" de "não amendada" — e só a segunda está autorizada.

O `AVISO:` em vez de `ERRO:` quando o portão fecha é deliberado (R-003): trata-se
de pendência de governança, não de integridade de dados. O site sobe com o
agregado publicado e os insumos omitidos, e a ausência é explicada em vez de
silenciosa.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

PADRAO_PENDENCIAS = ".specify/governanca/pendencias.yaml"
PADRAO_SAIDA = "public/dados"
PADRAO_AGREGADO = "data/dist/indicadores.zip"

# Mensagem para o visitante, usada quando a pendência não declara uma própria
# (Gg-6). Não pode conter identificadores internos (FR-011).
AVISO_PADRAO_VISITANTE = (
    "Os arquivos de origem estão sendo preparados para publicação e serão "
    "disponibilizados aqui em breve."
)


class ErroGovernanca(Exception):
    """Falha que impede o portão de avaliar (sempre exit 1)."""


@dataclass(frozen=True)
class Pendencia:
    """Uma pendência como declarada no registro (C-5)."""

    id: str
    descricao: str
    registro: str | None
    contem: str | None = None
    aviso_visitante: str | None = None


@dataclass
class PendenciaAvaliada:
    """Uma pendência depois de confrontada com o disco."""

    pendencia: Pendencia
    resolvida: bool
    motivo: str | None = None

    @property
    def id(self) -> str:
        return self.pendencia.id


@dataclass
class ResultadoPortao:
    """Veredito do portão, com o detalhe que sustenta a decisão."""

    aberto: bool
    pendencias: list[PendenciaAvaliada] = field(default_factory=list)

    @property
    def bloqueantes(self) -> list[PendenciaAvaliada]:
        return [p for p in self.pendencias if not p.resolvida]

    @property
    def aviso_visitante(self) -> str:
        """Texto a exibir ao visitante. O primeiro aviso wins, não a concatenação.

        Concatenar três avisos produziria um texto que soa como falha múltipla e
        sugere que o visitante precisa resolver algo. Ele não resolve nada: só
        precisa saber que os arquivos ainda não estão disponíveis.
        """
        for avaliada in self.bloqueantes:
            aviso = avaliada.pendencia.aviso_visitante
            if aviso:
                return aviso.strip()
        return AVISO_PADRAO_VISITANTE


@dataclass(frozen=True)
class Avaliacao:
    """Alias semântico para o retorno de `avaliar_pendencias`."""

    aberto: bool
    pendencias: list[PendenciaAvaliada]


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Verifica o registro de pendências de governança e copia os insumos "
            "brutos para public/dados apenas quando o portão está aberto. Portão "
            "fechado emite AVISO: e exit 0 — o build continua com o agregado."
        )
    )
    parser.add_argument(
        "--pendencias",
        default=PADRAO_PENDENCIAS,
        help=f"Registro de pendências (padrão: {PADRAO_PENDENCIAS})",
    )
    parser.add_argument(
        "--raiz",
        default=None,
        help="Raiz do repositório para resolver `registro` (padrão: autodetectada)",
    )
    parser.add_argument(
        "--saida-insumos",
        default=PADRAO_SAIDA,
        help=f"Destino dos artefatos publicados (padrão: {PADRAO_SAIDA})",
    )
    parser.add_argument(
        "--agregado",
        default=PADRAO_AGREGADO,
        help=(
            f"Pacote agregado, publicado independente do portão "
            f"(padrão: {PADRAO_AGREGADO}; vazio suprime)"
        ),
    )
    parser.add_argument(
        "--insumos",
        nargs="*",
        default=None,
        help=(
            "Insumos brutos a publicar quando o portão abrir. Padrão: "
            "exports_canonical.zip mais listagem_*.xlsx, descobertos no disco."
        ),
    )
    parser.add_argument(
        "--apenas-verificar",
        action="store_true",
        help="Só avalia o portão; não copia nada",
    )
    return parser


def detectar_raiz(caminho_pendencias: Path) -> Path:
    """Deduz a raiz do repositório a partir do caminho do registro.

    `registro` é relativo à raiz do repositório (Gg-2). O registro fica em
    `<raiz>/.specify/governanca/`, o que dá a raiz sem precisar de parâmetro —
    e sem depender do diretório de onde o script foi chamado.
    """
    resolvido = caminho_pendencias.resolve()
    for ancestral in resolvido.parents:
        if ancestral.name == "governanca" and ancestral.parent.name == ".specify":
            return ancestral.parent.parent
    return Path.cwd()


def _resolver_registro(registro: str, raiz: Path) -> Path:
    """Resolve `registro` rejeitando qualquer caminho que escape da raiz.

    Um `registro` apontando para fora do repositório faria o portão declarar
    "resolvida" por causa de um arquivo que o repositório não controla nem
    versiona — apagar esse arquivo reabriria a pendência sem ninguém perceber
    por quê. Rejeitar é mais seguro que resolver.
    """
    raiz_resolvida = raiz.resolve()
    candidato = (raiz_resolvida / registro).resolve()
    if not candidato.is_relative_to(raiz_resolvida):
        raise ErroGovernanca(
            f"registro fora da raiz do repositório: '{registro}' "
            f"(raiz: '{raiz_resolvida}')"
        )
    return candidato


def avaliar_pendencias(
    pendencias: list[Pendencia],
    *,
    raiz: Path,
) -> Avaliacao:
    """Confronta cada pendência com o disco. Nunca lança por registro ausente.

    Um `registro` faltando ou sem `contem` é uma pendência não resolvida com
    motivo — o resultado é sempre retorno, nunca exceção. Exceção aqui seria
    indistinguível de "o registro de pendências está quebrado", e as duas coisas
    exigem ações diferentes de quem lê o log.
    """
    raiz_resolvida = raiz.resolve()
    avaliadas: list[PendenciaAvaliada] = []

    for pendencia in pendencias:
        if pendencia.registro is None or not pendencia.registro.strip():
            avaliadas.append(
                PendenciaAvaliada(
                    pendencia=pendencia,
                    resolvida=False,
                    motivo="sem `registro` declarado no registro de pendências",
                )
            )
            continue

        try:
            caminho = _resolver_registro(pendencia.registro, raiz_resolvida)
        except ErroGovernanca as erro:
            avaliadas.append(
                PendenciaAvaliada(
                    pendencia=pendencia, resolvida=False, motivo=str(erro)
                )
            )
            continue

        if not caminho.exists():
            avaliadas.append(
                PendenciaAvaliada(
                    pendencia=pendencia,
                    resolvida=False,
                    motivo=f"registro ausente: {pendencia.registro}",
                )
            )
            continue

        if pendencia.contem is not None:
            try:
                conteudo = caminho.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError) as erro:
                avaliadas.append(
                    PendenciaAvaliada(
                        pendencia=pendencia,
                        resolvida=False,
                        motivo=f"registro ilegível: {pendencia.registro} ({erro})",
                    )
                )
                continue
            if pendencia.contem not in conteudo:
                avaliadas.append(
                    PendenciaAvaliada(
                        pendencia=pendencia,
                        resolvida=False,
                        motivo=(
                            f"registro existe mas não contém "
                            f"'{pendencia.contem}': {pendencia.registro}"
                        ),
                    )
                )
                continue

        avaliadas.append(PendenciaAvaliada(pendencia=pendencia, resolvida=True))

    return Avaliacao(aberto=all(a.resolvida for a in avaliadas), pendencias=avaliadas)


def ler_pendencias(caminho: Path) -> list[Pendencia]:
    """Lê e valida a estrutura do registro (C-5).

    Falha de leitura e estrutura inesperada são `ErroGovernanca` — o portão não
    tem como avaliar, e dizer "OK: nada pendente" seria publicar sem avaliação.
    """
    if not caminho.exists():
        raise ErroGovernanca(f"registro de pendências não encontrado: '{caminho}'")

    try:
        bruto = yaml.safe_load(caminho.read_text(encoding="utf-8"))
    except yaml.YAMLError as erro:
        raise ErroGovernanca(
            f"registro de pendências ilegível: '{caminho}' ({erro})"
        ) from erro
    except OSError as erro:
        raise ErroGovernanca(
            f"registro de pendências não pôde ser lido: '{caminho}' ({erro})"
        ) from erro

    if not isinstance(bruto, dict) or "pendencias" not in bruto:
        raise ErroGovernanca(
            f"registro de pendências sem a chave 'pendencias': '{caminho}'"
        )

    itens = bruto["pendencias"]
    if not isinstance(itens, list):
        raise ErroGovernanca(f"chave 'pendencias' deve ser uma lista: '{caminho}'")

    pendencias: list[Pendencia] = []
    vistos: set[str] = set()
    for posicao, item in enumerate(itens):
        if not isinstance(item, dict):
            raise ErroGovernanca(
                f"pendência #{posicao} não é um mapeamento: '{caminho}'"
            )
        identificador = item.get("id")
        if not isinstance(identificador, str) or not identificador.strip():
            raise ErroGovernanca(
                f"pendência #{posicao} sem `id` utilizável: '{caminho}'"
            )
        if identificador in vistos:
            raise ErroGovernanca(
                f"`id` duplicado no registro de pendências: '{identificador}' "
                f"('{caminho}')"
            )
        vistos.add(identificador)

        descricao = item.get("descricao")
        if not isinstance(descricao, str) or not descricao.strip():
            raise ErroGovernanca(
                f"pendência '{identificador}' sem `descricao` utilizável: '{caminho}'"
            )

        registro = item.get("registro")
        if registro is not None and not isinstance(registro, str):
            raise ErroGovernanca(
                f"pendência '{identificador}' com `registro` que não é "
                f"texto: '{caminho}'"
            )

        contem = item.get("contem")
        if contem is not None and not isinstance(contem, str):
            raise ErroGovernanca(
                f"pendência '{identificador}' com `contem` que não é texto: "
                f"'{caminho}'"
            )

        aviso = item.get("aviso_visitante")
        if aviso is not None and not isinstance(aviso, str):
            raise ErroGovernanca(
                f"pendência '{identificador}' com `aviso_visitante` que não é "
                f"texto: '{caminho}'"
            )

        pendencias.append(
            Pendencia(
                id=identificador,
                descricao=" ".join(descricao.split()),
                registro=registro,
                contem=contem,
                aviso_visitante=aviso,
            )
        )

    return pendencias


def descobrir_insumos(raiz: Path) -> list[str]:
    """Descobre os insumos brutos no disco (L-6: glob, não lista fixa).

    Um insumo novo que siga o padrão aparece sem alteração de código — a mesma
    razão pela qual o ETL tira o ano do nome do arquivo em vez de consultar um
    catálogo.
    """
    encontrados: list[str] = []

    canonico = raiz / "data/canonical/exports_canonical.zip"
    if canonico.is_file():
        encontrados.append("data/canonical/exports_canonical.zip")

    pasta_raw = raiz / "data/raw"
    if pasta_raw.is_dir():
        for planilha in sorted(pasta_raw.glob("listagem_*.xlsx")):
            encontrados.append(planilha.relative_to(raiz).as_posix())

    return encontrados


def _limpar_saida(destino: Path) -> None:
    """Esvazia o diretório de artefatos, preservando o ``.gitkeep``.

    Arquivos soltos e subdiretórios saem: um diretório colocado onde o artefato
    deveria estar também precisa ir, senão a cópia seguinte falha com ``EISDIR``
    e o artefato fica indisponível sem que ninguém saiba por quê.

    O ``.gitkeep`` fica porque ``public/dados/`` é versionado só por ele — sem o
    arquivo, a primeira execução real do portão tiraria o diretório do Git.
    """
    if not destino.is_dir():
        return
    for entrada in destino.iterdir():
        if entrada.name == ".gitkeep":
            continue
        if entrada.is_dir() and not entrada.is_symlink():
            shutil.rmtree(entrada, ignore_errors=True)
        else:
            entrada.unlink(missing_ok=True)


def _publicar(
    origem_raiz: Path,
    destino: Path,
    relativo: str,
) -> Path:
    """Copia um artefato de `raiz/relativo` para `destino`, sem escapar dele."""
    origem = (origem_raiz / relativo).resolve()
    raiz_resolvida = origem_raiz.resolve()
    if not origem.is_relative_to(raiz_resolvida):
        raise ErroGovernanca(f"insumo fora da raiz do repositório: '{relativo}'")

    if not origem.is_file():
        raise ErroGovernanca(f"insumo declarado e ausente em disco: '{relativo}'")

    destino.mkdir(parents=True, exist_ok=True)
    alvo = destino / origem.name
    if origem.resolve() == alvo.resolve():
        return alvo
    shutil.copy2(origem, alvo)
    return alvo


def _relatorio_bloqueio(resultado: ResultadoPortao) -> str:
    """Monta o `AVISO:` — nomeia quais pendências e como quitá-las (P-5)."""
    bloqueantes = resultado.bloqueantes
    linhas = [
        f"AVISO: governança — {len(bloqueantes)} pendência(s) impedem a "
        f"publicação dos insumos brutos:"
    ]
    for avaliada in bloqueantes:
        pendencia = avaliada.pendencia
        linhas.append(f"  - {pendencia.id}: {pendencia.descricao}")
        if avaliada.motivo:
            linhas.append(f"    estado: {avaliada.motivo}")
        destino = pendencia.registro or "<pendência sem registro declarado>"
        linhas.append(f"    como quitar: registre em {destino}")
    return "\n".join(linhas)


def main(argv: list[str] | None = None) -> int:
    parser = criar_argument_parser()
    args = parser.parse_args(argv)

    caminho_pendencias = Path(args.pendencias)
    raiz = Path(args.raiz) if args.raiz else detectar_raiz(caminho_pendencias)

    try:
        pendencias = ler_pendencias(caminho_pendencias)
    except ErroGovernanca as erro:
        sys.stderr.write(f"ERRO: {erro}\n")
        return 1

    try:
        avaliacao = avaliar_pendencias(pendencias, raiz=raiz)
    except ErroGovernanca as erro:
        sys.stderr.write(f"ERRO: {erro}\n")
        return 1

    resultado = ResultadoPortao(
        aberto=avaliacao.aberto, pendencias=list(avaliacao.pendencias)
    )

    destino = Path(args.saida_insumos)
    if not destino.is_absolute():
        destino = raiz / destino

    if args.apenas_verificar:
        # `--apenas-verificar` não copia nada — nem o agregado. Quem quer o
        # veredito sem efeito colateral precisa de um caminho que não escreva, e
        # "não copia os insumos mas copia o agregado" não é esse caminho.
        if resultado.aberto:
            print(
                f"OK: portão aberto ({len(pendencias)} pendência(s) "
                f"registrada(s)); nada copiado (--apenas-verificar)"
            )
        else:
            print(_relatorio_bloqueio(resultado))
            print(
                f"OK: portão fechado ({len(resultado.bloqueantes)} "
                f"pendência(s)); nada copiado (--apenas-verificar)"
            )
        return 0

    # O diretório de saída é esvaziado **antes** de qualquer cópia. Sem isto o
    # portão não é "fechado", é apenas silencioso: uma execução anterior, com o
    # portão aberto, deixou `exports_canonical.zip` em `public/dados/`, e uma
    # execução que apenas se recusa a copiar o deixaria no lugar — o Astro copia
    # `public/` para `dist/` no início do build e o site passaria a servir o
    # dado pessoal enquanto o log anunciava "omitidos". A limpeza também apaga
    # um artefato que saiu do disco entre execuções, em vez de deixá-lo órfão.
    #
    # O `.gitkeep` é preservado: sem ele `public/dados/` sairia do Git depois da
    # primeira execução.
    _limpar_saida(destino)

    # O agregado é publicado independente do portão (P-3): sem ele o site não
    # tem nada para mostrar, e a ausência do agregado é um problema de build,
    # não de governança.
    publicados_agregado: list[str] = []
    if args.agregado:
        try:
            publicados_agregado.append(_publicar(raiz, destino, args.agregado).name)
        except ErroGovernanca as erro:
            sys.stderr.write(f"ERRO: {erro}\n")
            return 1

    insumos = (
        list(args.insumos) if args.insumos is not None else descobrir_insumos(raiz)
    )

    publicados_insumo: list[str] = []
    if not resultado.aberto:
        print(_relatorio_bloqueio(resultado))
        print(
            f"OK: pacote agregado publicado ({len(publicados_agregado)} "
            f"artefato); insumos brutos omitidos ({len(insumos)})"
        )
        return 0

    for relativo in insumos:
        try:
            publicados_insumo.append(_publicar(raiz, destino, relativo).name)
        except ErroGovernanca as erro:
            sys.stderr.write(f"ERRO: {erro}\n")
            return 1

    print(
        f"OK: portão aberto ({len(pendencias)} pendência(s) registrada(s)); "
        f"pacote agregado publicado ({len(publicados_agregado)} artefato); "
        f"insumos brutos publicados ({len(publicados_insumo)})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
