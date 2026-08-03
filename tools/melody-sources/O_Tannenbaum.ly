<score sound="1" raw="1">
\header { tagline = ##f }
\paper { paper-width = 200\mm }
\layout { indent = 0
  \context { \Score \remove "Bar_number_engraver" }
  \context { \Voice \remove "Dynamic_engraver" }
}

global = { \key g \major \time 3/4 \partial 8 }

chordNamesC = \chordmode { \global \set midiInstrument = "acoustic guitar (nylon)"
  \set chordChanges = ##t \transpose c c, {
  s8 | g2\pp d4 | g2. | a2:m d4:7~ | d:7 g s8 }
}
chordNamesV = \chordmode { \set midiInstrument = "acoustic guitar (nylon)"
  \set chordChanges = ##t \transpose c c, {
  s8 | g4:7 c2 | d2.:7 | d:7 | g2 s8 \bar "|." }
}

sopranoC = \relative c' { \global \autoBeamOff \set midiInstrument = "flute"
  d8 | g8. g16 g4 a | b8. b16 b4. b8 | a b c4 fis, | a g r8^"Fine" \bar "|." \break
}
sopranoV = \relative c' { \autoBeamOff \set midiInstrument = "flute"
  d'8 | d b e4. d8 | d c c4. c8 | c a d4. c8 | c b b4^"D.C. al fine" r8 \bar "|."
}
verse = \lyricmode {
  O Tan -- nen -- baum, o Tan -- nen -- baum!
  Wie treu sind dei -- ne Blät -- ter;
  du grünst nicht nur zur Som -- mer -- zeit,
  nein, auch im Win -- ter, wenn es schneit.
  O Tan -- nen -- baum, o Tan -- nen -- baum,
  wie treu sind dei -- ne Blät -- ter.
}

rightC = \relative c' { \global
  d8~\pp | <d b>2 <fis d>4 | <g d> <gis e>2 | e4 <a e> d, | c8. b16 b4 r8
}
rightV = \relative c' {
  g'8~ | g4 <c g>2\pp | <a fis>4 <fis d>2 | <fis d>4 <a fis>2 | <g d>4 q r8 \bar "|."
}
leftC = \relative c' { \global
  d,8 | <b' g>2\p <fis d>4 | f e d | <a' c,>2 <a d,>4 | <fis g,> <g g,> r8
}
leftV = \relative c' {
  r8 | <g g,>4 q q | <a a,> q q | <d, d,> q q | <g g,> q r8 \bar "|."
}
\score {
  <<
    \new ChordNames { \chordNamesC \chordNamesV }
    \new Staff { \sopranoC \sopranoV } \addlyrics \verse
    \new PianoStaff <<
      \new Staff { \rightC \rightV }
      \new Staff { \clef bass \leftC \leftV }
    >>
  >>
  \layout { }
}
\score { \unfoldRepeats {
  << \chordNamesC \\ \sopranoC \\ \leftC \\\rightC >>
  << \chordNamesV \\ \sopranoV \\ \leftV \\\rightV >>
  << \chordNamesC \\ \sopranoC \\ \leftC \\\rightC >>
  }
  \midi {
    \tempo 4 = 90
    \context { \Score midiChannelMapping = #'instrument }
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
  }
}
</score>
