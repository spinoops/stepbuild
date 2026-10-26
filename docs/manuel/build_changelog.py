# -*- coding: utf-8 -*-
"""
Génère le PDF des nouveautés livrées entre deux dates (document court pour le client).

    python build_changelog.py   -> docs/Nouveautés - StepBuild - 23 au 26 octobre 2026.pdf

Reprend la charte du mode d'emploi (build_manual.py). Police Helvetica : caractères WinAnsi seulement.
À chaque livraison : mettre à jour PERIOD, OUTPUT et la liste des points.
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer

from build_manual import ANTHRACITE, BODY, CONTENT_W, GREY, H1, H2, LEAD, MARGIN, PAGE_H, PAGE_W, RED, bullets, note, p, tip

HERE = os.path.dirname(os.path.abspath(__file__))
PERIOD = 'du 23 au 26 octobre 2026'
OUTPUT = os.path.join(HERE, '..', 'Nouveautés - StepBuild - 23 au 26 octobre 2026.pdf')


def header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ANTHRACITE)
    canvas.rect(0, PAGE_H - 2.6 * cm, PAGE_W, 2.6 * cm, stroke=0, fill=1)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 2.6 * cm - 2.5, PAGE_W, 2.5, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 15)
    canvas.drawString(MARGIN, PAGE_H - 1.65 * cm, 'StepBuild — Nouveautés')
    canvas.setFont('Helvetica', 10)
    canvas.setFillColor(colors.HexColor('#d1d5db'))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.65 * cm, f'Lachat Construction Sàrl  ·  {PERIOD}')
    canvas.setFillColor(GREY)
    canvas.setFont('Helvetica', 8.5)
    canvas.drawString(MARGIN, 1.05 * cm, 'Stéphane Offreda — Step One')
    canvas.drawRightString(PAGE_W - MARGIN, 1.05 * cm, f'Page {doc.page}')
    canvas.restoreState()


def story():
    return [
        Spacer(1, 6),
        Paragraph(f'Nouveautés livrées {PERIOD}', H1),
        p("Ce document résume ce qui a changé dans StepBuild depuis la livraison du 22 octobre, à la suite de vos "
          "retours. Tout est en ligne. Le mode d'emploi a été mis à jour en conséquence (version 0.5).", LEAD),

        Paragraph('1. Le sous-détail de prix et les éléments de coûts', H2),
        bullets([
            "<b>Les ouvrages du métreur sont rattachés aux éléments de coûts</b> : chaque ligne d'un sous-détail type "
            "peut pointer sur un élément de la liste de prix (pastille avec son numéro) et prend alors <b>ses prix, à "
            "jour</b>. 170 lignes des 110 ouvrages ont été rattachées d'office (main-d'œuvre, machines, matériaux sans "
            "ambiguïté) ; les autres se rattachent d'un clic sur l'étiquette au survol de la ligne.",
            "Chaque ligne a maintenant un <b>prix d'achat</b> et un <b>prix de vente</b> unitaires, et la <b>marge</b> en "
            "pour cent ; la vente de la ligne utilise le prix de vente. Saisir l'un des trois recalcule les deux autres.",
            "La main-d'œuvre des ouvrages est comptée en heures d'Ouvrier qualifié au tarif de la liste de prix "
            "(52.78 d'achat, 90.- de vente), soit 810.- la journée de 9 h : à valider avec le métreur (le Word comptait 750.-).",
            "<b>Éléments de coûts</b> : la liste et la fiche ne montrent plus que <b>Prix d'achat</b> et <b>Prix de vente</b>.",
        ]),

        Paragraph('2. La fenêtre du sous-détail', H2),
        bullets([
            "Elle occupe toute la fenêtre : le calcul de la ligne à gauche, la <b>bibliothèque des ouvrages</b> à droite "
            "(recherche, rangement par corps de métier, un clic charge l'ouvrage, l'ouvrage chargé est surligné).",
            "<b>Création directe</b> d'un ouvrage : choisissez le groupe, donnez un nom, Créer : les lignes saisies "
            "deviennent un sous-détail type. Au survol d'un ouvrage : mettre à jour ses lignes, ou le supprimer.",
        ]),

        Paragraph('3. Le devis', H2),
        bullets([
            "<b>Unités</b> : par ordre alphabétique, avec recherche en tapant les premières lettres (m2, pce, jo…) ; "
            "Entrée prend l'unité et passe à la quantité.",
            "<b>Catalogue</b> : sélection de plusieurs articles ou chapitres (Ctrl + clic, Maj + clic) et glisser "
            "ensemble ; <b>+</b> au survol d'un chapitre pour créer un article (description, unité, prix) sans quitter le devis.",
            "Le champ d'ajout d'article sous chaque étape a disparu : les articles arrivent du catalogue, en glissant. "
            "Les titres, sous-titres et textes s'insèrent par le <b>+</b> qui apparaît au survol d'une ligne.",
            "<b>Titre de chapitre entre les lignes</b> : un nouveau chapitre numéroté, les lignes en dessous passent dessous.",
            "<b>Totaux par étape</b> : le montant de chaque étape sous ses lignes, à l'écran et dans le PDF (option, cochée d'office).",
            "<b>Options</b> : prix et montant entre parenthèses ; la récapitulation et la page de garde rappellent le "
            "total des options, non compris dans le devis.",
            "Le volet « Étapes et devis » du panneau de gauche est replié par défaut ; les sous-détails affichés en "
            "rouge passent à la ligne au lieu de déborder.",
        ]),

        Paragraph('4. Rapports journaliers', H2),
        bullets([
            "Les statuts s'appellent désormais <b>En cours</b>, <b>Contrôlé</b> et <b>Facturé</b>.",
        ]),

        note("Le mode d'emploi, version 0.5 du 26 octobre 2026, décrit chacun de ces points avec des captures d'écran."),
        tip("Pour tout retour, signalez la page concernée et ce que vous cherchiez à faire : la prochaine livraison "
            "portera sur la facture finale."),
        Spacer(1, 10),
        p('Stéphane Offreda — Step One', BODY),
    ]


def main():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=3.3 * cm, bottomMargin=2 * cm,
        title=f'StepBuild — Nouveautés {PERIOD}', author='Stéphane Offreda — Step One', subject='Lachat Construction Sàrl',
    )
    frame = Frame(MARGIN, 2 * cm, CONTENT_W, PAGE_H - 5.3 * cm, id='main', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='page', frames=[frame], onPage=header)])
    doc.build(story())
    print('PDF :', os.path.normpath(OUTPUT))


if __name__ == '__main__':
    main()
