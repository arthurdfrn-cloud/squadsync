"""Ajoute une transition Morph (PowerPoint 2019 / Microsoft 365) à chaque diapositive,
avec un repli automatique en fondu pour les versions qui ne gèrent pas Morph.
Balisage identique à celui qu'écrit PowerPoint (mc:AlternateContent)."""
import re
import shutil
import sys
import zipfile

P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
MORPH = (
    f'<mc:AlternateContent xmlns:mc="{MC}">'
    '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
    '<p:transition spd="slow" p14:dur="1200"><p159:morph option="byObject"/></p:transition>'
    "</mc:Choice>"
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>'
    "</mc:AlternateContent>"
)


def patch(xml: str) -> str:
    xml = re.sub(r"<mc:AlternateContent[^>]*>\s*<mc:Choice[^>]*p159.*?</mc:AlternateContent>", "", xml, flags=re.S)
    xml = re.sub(r"<p:transition\b.*?</p:transition>|<p:transition\b[^>]*/>", "", xml, flags=re.S)
    root = re.search(r"<p:sld\b[^>]*>", xml)
    tag = root.group(0)
    if "xmlns:p14=" not in tag:
        xml = xml.replace(tag, tag[:-1] + f' xmlns:p14="{P14}">', 1)
    # Ordre du schéma : cSld, clrMapOvr, transition, timing, extLst
    for anchor in ("<p:timing", "<p:extLst", "</p:sld>"):
        i = xml.find(anchor)
        if i != -1:
            return xml[:i] + MORPH + xml[i:]
    raise ValueError("slide sans </p:sld>")


def main(path):
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                data = patch(data.decode("utf-8")).encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)


if __name__ == "__main__":
    main(sys.argv[1])
