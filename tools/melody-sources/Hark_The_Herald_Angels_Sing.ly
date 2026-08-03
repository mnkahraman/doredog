<score raw="1" vorbis="1">
% There are many different arrangements;
% this is from https://imslp.org/wiki/File:PMLP576994-Hark_the_Herald_Angels_Sing_Full_Score.pdf
\header { tagline = ##f }
\layout { indent = 0 \context { \Score \remove "Bar_number_engraver" } }
global = { \key f \major \numericTimeSignature \time 4/4 \set Score.tempoHideNote = ##t }

soprano = \relative c' { \global
  c4 f f4. e8 |
  f4 a a (g) |
  c c c4. bes8 |
  a4 g a2 |
  c,4 f f4. e8 |
  f4 a a (g) |
  c4 g g4. e8 |
  e4 d c2 |
  \repeat unfold 2 { c'4 c c f, |
    bes a a (g) | }
  d'4 d d c |
  bes a bes2 |
  g4 a8 (bes) c4. f,8 |
  f4 g a2 |
  d4. d8 d4 c |
  bes a bes2 |
  g4 \tempo 4=102 a8 (bes) c4. f,8 |
  f4 g f2 \bar "|."
}

alto = \relative c' {
  \global
  c4 c c4. c8 |
  c4 f f (e) |
  f e d g |
  f4 e f2 |
  c4 c c4. c8 |
  a4 f' f2 |
  e4 d e4. c8 |
  c4 b c2 |
  \repeat unfold 2 { c4 c c f |
    g f f (e) | }
  bes'4 bes bes a |
  g fis g2 |
  e4 e4 f4. c8 |
  c4 e f2 |
  bes4 bes bes a |
  g fis g2 |
  c,4 e4 f4. f8 |
  c4 c c2
}

tenor = \relative c { \global
  a'4 a a4. g8 |
  f4 c' c2 |
  c4 c d d |
  c c c2 |
  a4 a a4. g8 |
  f4 c' d2 |
  c4 d c4. g8 |
  a4 f e2 |
  \repeat unfold 2 { c'4 c c c | c c c2 } |
  d4 d d d |
  d c bes2 |
  c4 c c4. a8 |
  a4 c c2 |
  <d bes>4 q q <c a> |
  <bes g> <a fis> bes2
  c4 c c4. a8 |
  a4 bes a2
}

bass = \relative c { \global
  f4 f f4 c |
  a4 f c'2 |
  a4 a bes bes |
  c4 c f2 |
  f4 f f c |
  d4 c b4. (g8) |
  a4 b c4 <e, e'> |
  f4 g c2 |
  \repeat unfold 2 { c'4 c c a | e f c2 } |
  bes4 bes bes bes |
  bes d g2 |
  bes4 bes a f |
  c4 c f2 |
  bes,1~ | bes4 d g (f)
  e bes' a f |
  c4 c f2
}

verseOne = \lyricmode {
  \set stanza = "1."
  Hark! the her -- ald an -- gels sing,
  "\"Glo" -- ry to the new -- born King;
  peace on earth, and mer -- cy mild,
  God and sin -- ners rec -- on -- "ciled!\"" \break
  Joy -- ful, all ye na -- tions rise,
  join the tri -- umph of the skies;
  With th'an -- gel -- ic host pro -- claim
  "\"Christ" is born in Beth -- le -- "hem!\""
  Hark! the her -- ald an -- gels sing,
  "\"Glo" -- ry to the new -- born "king.\""
}

verseTwo = \lyricmode {
  \set stanza = "2."
  Christ, by high -- est heav'n a -- dored,
  Christ, the ev -- er -- last -- ing Lord!
  late in time be -- hold him come,
  Off -- spring of the Vir -- gin's womb:
  veiled in flesh the God -- head see;
  hail th'in -- car -- nate De -- i -- ty,
  pleased as man with men to dwell,
  Je -- sus, our Em -- man -- u -- el!
}

verseThree = \lyricmode {
  \set stanza = "3."
  Hail, the heav'n -- born Prince of Peace!
  Hail the Sun of Right -- eous -- ness!
  Light and life to all he brings,
  ris'n with heal -- ing in his wings.
  Mild He lays his glo -- ry by,
  born that we no more may die,
  born to raise us from the earth,
  born to give us sec -- ond birth.
}

\score {
  \new ChoirStaff <<
    \new Staff \with { midiInstrument = "brass section" }
    <<
      \new Voice = "soprano" { \voiceOne \soprano }
      \new Voice = "alto" { \voiceTwo \alto }
    >>
    \new Lyrics \lyricsto "soprano" \verseOne
    \new Lyrics \lyricsto "soprano" \verseTwo
    \new Lyrics \with { \override VerticalAxisGroup #'staff-affinity = #CENTER } % a little less spacing
      \lyricsto "soprano" \verseThree
    \new Staff \with { midiInstrument = "tuba" }
    <<
      \clef bass
      \new Voice = "tenor" { \voiceOne \tenor }
      \new Voice = "bass" { \voiceTwo \bass }
    >>
  >>
  \layout { }
  \midi { \tempo 4=112 }
}
</score>
