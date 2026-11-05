# 分子の一覧（tools/molecules.tsv）から data.js を作る。使い方: python3 tools/make-data.py（RDKit が要る: pip install rdkit）
# 原子は H 以外（C・N・O・Cl）を盤に出し、H は残った手に自動で付く。結合は二重・三重を明示した形（ケクレ構造）にする。
import json, sys, os
from rdkit import Chem
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

HANDS = {"C": 4, "N": 3, "O": 2, "Cl": 1}
# 炭素の無い分子などは、教科書でよく見る書き方にする（RDKit は Hill 方式で H4N2・CHN と書く）
FORMULA = {"ヒドラジン": "N2H4", "シアン化水素": "HCN"}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mols = []
for line in open(os.path.join(root, "tools", "molecules.tsv"), encoding="utf-8"):
    if line.startswith("#") or not line.strip():
        continue
    st, name, smi, clue, fact = line.rstrip("\n").split("\t")
    m = Chem.MolFromSmiles(smi)
    Chem.Kekulize(m, clearAromaticFlags=True)
    atoms = [a.GetSymbol() for a in m.GetAtoms()]
    for a in m.GetAtoms():
        s = a.GetSymbol()
        if s not in HANDS or a.GetFormalCharge() != 0:
            sys.exit(f"{name}: 使えない原子 {s}")
    bonds = sorted([sorted([b.GetBeginAtomIdx(), b.GetEndAtomIdx()]) + [int(b.GetBondTypeAsDouble())] for b in m.GetBonds()])
    hs = [a.GetTotalNumHs() for a in m.GetAtoms()]
    for i, s in enumerate(atoms):
        used = sum(o for a, b, o in bonds if i in (a, b))
        if used + hs[i] != HANDS[s]:
            sys.exit(f"{name}: {s} の手の数が合わない")
    mols.append({"st": int(st), "n": name, "f": FORMULA.get(name, CalcMolFormula(m)), "a": atoms, "b": bonds, "h": sum(hs), "c": clue, "t": fact, "smi": Chem.MolToSmiles(Chem.MolFromSmiles(smi))})
names = [x["n"] for x in mols]
assert len(names) == len(set(names)), "名前が重なっている"
out = "// tools/make-data.py で作る（手で直さない）。原子は H 以外、結合は [i, j, 何重か]、h は H の数。\nwindow.MOLS = " + json.dumps([{k: v for k, v in x.items() if k != "smi"} for x in mols], ensure_ascii=False, separators=(",", ":")) + ";\nif (typeof module !== \"undefined\") module.exports = window.MOLS;\n"
open(os.path.join(root, "data.js"), "w", encoding="utf-8").write(out.replace("window.MOLS", "(typeof window !== \"undefined\" ? window : globalThis).MOLS", 1).replace("module.exports = window.MOLS", "module.exports = (typeof window !== \"undefined\" ? window : globalThis).MOLS"))
json.dump([[x["n"], x["smi"]] for x in mols], open(os.path.join(root, "tools", "smiles.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(mols), "分子")
