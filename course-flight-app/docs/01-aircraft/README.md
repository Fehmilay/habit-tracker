# 01 – Flugzeug

## Ziel

Ein glaubwürdiges, eindeutig dreidimensionales Verkehrsflugzeug aus der
Verfolgerperspektive. Kein Emoji, kein Icon, kein flaches SVG, kein PNG, keine
Linienzeichnung.

## Technische Umsetzung

**Gewählte Lösung: prozedurale Three.js-Geometrie** (Priorität 2 der Vorgabe).

Begründung gegen ein GLB/GLTF-Modell: keine Lizenz eines Dritten mitzuführen, kein
Laufzeit-Download der bei schlechter Verbindung fehlschlagen kann, und volle Kontrolle
über die Silhouette. Letzteres ist hier entscheidend, weil die App das Flugzeug
ausschließlich von schräg hinten zeigt – Roll- und Gierbewegung müssen genau aus diesem
einen Blickwinkel klar ablesbar sein.

Aufbau (`src/lib/flight/aircraftGeometry.ts`):

| Bauteil | Technik |
| --- | --- |
| Rumpf | `LatheGeometry` aus einem 17-Punkt-Profil, danach um -90° gedreht, Heckkonus per Vertex-Offset angehoben |
| Tragflächen | `ExtrudeGeometry` aus einem gepfeilten, zugespitzten Grundriss, mit Bevel für Profilkanten, 5° V-Stellung |
| Winglets | gleiche Technik, an der Flügelspitze aufgerichtet |
| Seitenleitwerk | dieselbe Auftriebsfläche, um 90° um Z gedreht |
| Höhenleitwerke | kleinere Auftriebsfläche, 7° V-Stellung |
| Triebwerke | Zylinder-Gondel, Torus-Einlauflippe, animierte Fan-Scheibe, Düse, Auslasskonus, Pylon |
| Kabinenfenster | `InstancedMesh`, Position folgt dem lokalen Rumpfradius |
| Cockpitverglasung | `InstancedMesh`, dunkles, stark spiegelndes Material |
| Positionslichter | emissive Kugel plus additives Sprite-Glühen |

**Proportionen.** Rumpfschlankheit ca. 8:1 und Flügelwurzeltiefe ca. 18 % der Rumpflänge.
Beide Werte mussten korrigiert werden: ein dickerer Rumpf staucht sich aus der
Heckperspektive zu einer Scheibe zusammen, und eine zu große Flügeltiefe ließ beide
Tragflächen zu einer einzigen Deltafläche verschmelzen.

**Materialien.** Leicht metallischer Rumpf (`metalness` 0.62, `roughness` 0.34), silberne
Grundfarbe, kein Chrom. Subtile Reflexionen über eine prozedural erzeugte
Environment-Map (siehe `03-environment`). Rotes Positionslicht links, grünes rechts,
weißes am Heck, pulsierendes rotes Beacon auf dem Rumpfrücken.

**Bewegung.** Erlaubt sind eine minimale gedämpfte Höhenbewegung, sehr leichte Turbulenz
und die Triebwerksanimation. Alle drei sind **deterministische Sinusüberlagerungen**, kein
Zufall – dadurch wackelt das Flugzeug nie unkontrolliert und Animationen sind
reproduzierbar. Richtungsänderungen entstehen ausschließlich aus der Kurslogik.

## Dateien

- `src/lib/flight/aircraftGeometry.ts`
- `src/lib/flight/textures.ts`
- `src/components/flight/Aircraft3D.tsx`

## Risiken

- Prozedurale Geometrie erreicht nicht die Detailtiefe eines echten Modells. Falls später
  gewünscht, kann ein lizenziertes GLB eingesetzt werden; die Schnittstelle
  (`flightRuntime` → Gruppenrotation) bleibt identisch.
- Aus exakt hinterer Perspektive verdeckt der Rumpf Teile der Flügel. Die Kamerahöhe von
  ca. 20° gleicht das aus.

## Performanceaspekte

Ca. 3–4k Dreiecke, rund zehn Draw Calls. Rumpfsegmente werden nach Gerätestufe von 30 auf
16 reduziert. Alle Texturen sind prozedural und höchstens 128 px. Geometrien und Texturen
werden beim Unmount freigegeben.

## Tests

- E2E: Szene rendert, keine Konsolenfehler
- Visuell: hochauflösende Nahaufnahmen über `scripts/inspect.mjs`

## Abnahmekriterien

- [x] Rumpf, Cockpitbereich, zwei Tragflächen, Seitenleitwerk, Höhenleitwerke, zwei
      Triebwerke vorhanden
- [x] Echte räumliche Tiefe, kein flaches Icon
- [x] Unterschiedliche Materialien für Rumpf, Fenster, Triebwerke, Positionslichter
- [x] Bewegung nur gedämpft und deterministisch
