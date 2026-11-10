"""Ajoute une transition en fondu (standard PowerPoint, compatible toutes versions) à chaque diapositive."""
import re
import sys
import zipfile
import shutil

TRANSITION = '<p:transition spd="slow"><p:fade/></p:transition>'


def main(path):
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                xml = data.decode("utf-8")
                xml = re.sub(r"<p:transition\b.*?</p:transition>|<p:transition\b[^>]*/>", "", xml, flags=re.S)
                # Ordre du schéma : cSld, clrMapOvr, transition, timing, extLst
                for anchor in ("<p:timing", "<p:extLst", "</p:sld>"):
                    i = xml.find(anchor)
                    if i != -1:
                        xml = xml[:i] + TRANSITION + xml[i:]
                        break
                data = xml.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)


if __name__ == "__main__":
    main(sys.argv[1])
