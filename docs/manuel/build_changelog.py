# -*- coding: utf-8 -*-
"""
Génère le PDF des nouveautés livrées entre deux dates : une page, pour le client.

    python build_changelog.py   -> docs/Nouveautés - StepBuild - 23 au 26 octobre 2026.pdf

Reprend la charte du mode d'emploi (build_manual.py). Police Helvetica : caractères WinAnsi seulement.
À chaque livraison : mettre à jour PERIOD, OUTPUT et la liste des points ; vérifier qu'il tient sur une page.
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import BaseDocTemplate, Frame, ListFlowable, ListItem, PageTemplate, Paragraph, Spacer

from build_manual import ANTHRACITE, BLUE, CONTENT_W, GREY, MARGIN, PAGE_H, PAGE_W, RED

HERE = os.path.dirname(os.path.abspath(__file__))
PERIOD = 'du 23 au 26 octobre 2026'
OUTPUT = os.path.join(HERE, '..', 'Nouveautés - StepBuild - 23 au 26 octobre 2026.pdf')

# Styles compacts : le document tient sur une page.
TEXT = ParagraphStyle('CText', fontName='Helvetica', fontSize=9.2, leading=12, textColor=colors.HexColor('#1f2937'), spaceAfter=3)
INTRO = ParagraphStyle('CIntro', parent=TEXT, fontSize=9.8, leading=13, textColor=colors.HexColor('#374151'), spaceAfter=6)
TITLE = ParagraphStyle('CTitle', fontName='Helvetica-Bold', fontSize=16, leading=19, textColor=BLUE, spaceAfter=6)
HEAD = ParagraphStyle('CHead', fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=ANTHRACITE, spaceBefore=6, spaceAfter=2, keepWithNext=1)
FOOT = ParagraphStyle('CFoot', parent=TEXT, fontSize=8.6, leading=11, textColor=GREY, spaceBefore=6)


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(item, TEXT), leftIndent=11, bulletColor=BLUE) for item in items],
        bulletType='bullet', start='•', bulletFontSize=8, leftIndent=11, bulletOffsetY=-1, spaceAfter=2,
    )


def header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ANTHRACITE)
    canvas.rect(0, PAGE_H - 2.2 * cm, PAGE_W, 2.2 * cm, stroke=0, fill=1)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 2.2 * cm - 2.5, PAGE_W, 2.5, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 14)
    canvas.drawString(MARGIN, PAGE_H - 1.4 * cm, 'StepBuild — Nouveautés')
    canvas.setFont('Helvetica', 9.5)
    canvas.setFillColor(colors.HexColor('#d1d5db'))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.4 * cm, f'Lachat Construction Sàrl  ·  {PERIOD}')
    canvas.setFillColor(GREY)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(MARGIN, 0.9 * cm, 'Stéphane Offreda — Step One')
    canvas.drawRightString(PAGE_W - MARGIN, 0.9 * cm, f'Page {doc.page}')
    canvas.restoreState()


def story():
    return [
        Paragraph(f'Nouveautés livrées {PERIOD}', TITLE),
        Paragraph("Ce qui a changé dans StepBuild depuis la livraison du 22 octobre, à la suite de vos retours. Tout est en "
                  "ligne ; le mode d'emploi (version 0.5) décrit chaque point avec des captures d'écran.", INTRO),

        Paragraph('1. Sous-détail de prix', HEAD),
        bullets([
            "La fenêtre du sous-détail a une colonne avec les <b>types de sous-détails</b> repris de votre document Word "
            "(les ouvrages du métreur, par corps de métier) : un clic ajoute l'ouvrage à la ligne. On peut en <b>créer de "
            "nouveaux</b> directement depuis les lignes saisies, les mettre à jour ou les supprimer.",
            "Chaque ligne a un <b>prix d'achat</b>, un <b>prix de vente</b> et la <b>marge</b> ; les lignes prises dans la liste "
            "des éléments de coûts gardent le prix de la liste, à jour.",
        ]),

        Paragraph('2. Éléments de coûts', HEAD),
        bullets([
            "La liste et la fiche ne montrent plus que <b>Prix d'achat</b> et <b>Prix de vente</b>.",
            "Pour un nouvel élément, le groupe et le <b>numéro sont attribués automatiquement</b> (le suivant du groupe), "
            "modifiables.",
        ]),

        Paragraph('3. Devis', HEAD),
        bullets([
            "<b>Unités</b> par ordre alphabétique, trouvées en tapant les premières lettres ; Entrée prend l'unité et passe à la quantité.",
            "<b>Catalogue</b> : sélection de plusieurs articles ou chapitres (Ctrl + clic, Maj + clic) et glisser ensemble ; "
            "<b>+</b> au survol d'un chapitre pour créer un article sans quitter le devis.",
            "Plus de champ d'ajout sous les étapes : les articles arrivent du catalogue en glissant ; titres de chapitre, "
            "sous-titres et textes s'insèrent par le <b>+</b> au survol d'une ligne (un titre de chapitre coupe l'étape en deux).",
            "<b>Totaux par étape</b> sous les lignes, à l'écran et dans le PDF (option, cochée d'office) ; <b>options</b> entre "
            "parenthèses, avec leur total dans la récapitulation et sur la page de garde.",
            "Volet « Étapes et devis » replié par défaut ; les sous-détails en rouge passent à la ligne.",
        ]),

        Paragraph('4. Rapports journaliers', HEAD),
        bullets(["Les statuts s'appellent <b>En cours</b>, <b>Contrôlé</b> et <b>Facturé</b>."]),

        Paragraph("Pour tout retour, indiquez la page et ce que vous cherchiez à faire. Prochaine étape : la facture finale.  —  "
                  "Stéphane Offreda, Step One", FOOT),
    ]


def main():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=2.8 * cm, bottomMargin=1.6 * cm,
        title=f'StepBuild — Nouveautés {PERIOD}', author='Stéphane Offreda — Step One', subject='Lachat Construction Sàrl',
    )
    frame = Frame(MARGIN, 1.6 * cm, CONTENT_W, PAGE_H - 4.4 * cm, id='main', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='page', frames=[frame], onPage=header)])
    doc.build(story())
    print('PDF :', os.path.normpath(OUTPUT))


if __name__ == '__main__':
    main()
