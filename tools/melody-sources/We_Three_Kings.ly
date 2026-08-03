<score raw="1" sound="1">
\header { tagline = ##f }
\layout { indent = 0 \set Score.tempoHideNote = ##t
  \context { \Score \remove "Bar_number_engraver" }
  \context { \Voice \consists "Melody_engraver" }
}

global = { \key e \minor \time 3/8 }

chordNames = \chordmode {
  \global \set midiInstrument = #"acoustic guitar (steel)"
  \repeat volta 2 { e4.:m\p | e:m | b:7 | e:m }
  \once \set chordChanges = ##f e:m | d | g | g | a:m | e4:m b8:7 | e4.:m \bar "||"
  d:7 | \repeat volta 2 { g | g | c | g | }
  e:m | d4 g8 | c4 g8 | d4 g8 | g4 c8 | g4. | c | g \bar "|."
}

soprano = \relative c'' {
  \global \set midiInstrument = #"trumpet" \tempo 4=100
  \repeat volta 2 { b4 a8 | g4 e8 | fis g fis | e4 r8 | }
  g4 g8 | a4 a8 | b4 b8 | d (c) b | a b a | g4 fis8 | e4 r8 \bar "||"
  \tempo 4=45 fis4\fermata (\tempo 4=24 a8) | \tempo 4=100 \repeat volta 2 { g4 g8 | g4 d8 | g4 e8 | g4 r8 | }
  g4 g8 | a4 b8 | c4 b8 | a4 b8 |
  g4 g8 | g4 d8 | g4 e8 | g4. \bar "|."
}

alto = \relative c' {
  \global \set midiInstrument = #"trumpet"
  \repeat volta 2 { e4 fis8 | e4 b8 | dis dis dis | b4 r8 | }
  e4 e8 | fis4 fis8 | g4 g8 | g (a) g | e e e |e4 dis8 | b4 r8 \bar "||"
  d4. | \repeat volta 2 { d4 d8 | d4 b8 |e4 c8 | d4 r8 | }
  e4 e8 |fis4 g8 | g4 g8 | fis4 g8 | g4 e8 | d4 d8 | e4 c8 | d4. \bar "|."
}

tenor = \relative c' {
  \global \set midiInstrument = #"french horn"
  \repeat volta 2 { g4 b8 | b4 g8 | a b a | g4 r8 | }
  b4 b8 |d4 d8 | d4 d8 | d4 d8 | c c c | b4 a8 g4 r8 \bar "||"
  c4.\fermata | \repeat volta 2 { b4 b8 | b4 g8 | g4 g8 | b4 r8 | }
  b4 b8 |d4 d8 | e4 d8 |d4 d8 | b4 c8 | b4 g8 | g4 a8 | b4. \bar "|."
}

bass = \relative c {
  \global \set midiInstrument = #"french horn"
  \repeat volta 2 { e4 e8 | e4 e8 | b b b | e4 r8 | }
  e4 e8 |d4 d8 | g4 g8 | b (fis) g | a a a | b4 b,8 | e4 r8 \bar "||"
  d4. | \repeat volta 2 { g4 g8 | g4 g8 | c,4 c8 | g4 r8 | }
  e'4 e8 | d4 g8 | c,4 g'8 | d4 g8 | g4 g8 | g4 b,8 | c4 c8 | <g g'>4. \bar "|."
}

verse = \lyricmode {
  We three kings of O -- ri -- ent are,
  Field and foun -- tain, Moor and moun -- tain,
  Fol -- low -- ing yon -- der star.
    
  O star of won -- der, star of night,
    
  West -- ward lead -- ing,
  Still pro -- ceed -- ing,
  Guide us to Thy per -- fect light.
}
verseR = \lyricmode { % This is a terrible hack to get the lyrics aligned.
  Bear -- ing gifts we tra -- verse a -- far,
  "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" Star with roy -- al beau -- ty bright,
}

chordsPart = \new ChordNames { \set chordChanges = ##t \chordNames }

choirPart = \new ChoirStaff <<
  \new Staff \with { \consists "Merge_rests_engraver" }
  <<
    \new Voice = "soprano" { \voiceOne \soprano }
    \new Voice = "alto" { \voiceTwo \alto }
  >>
  \new Lyrics \lyricsto "soprano" \verse
  \new Lyrics \lyricsto "soprano" \verseR
  \new Staff \with { \consists "Merge_rests_engraver" }
  <<
    \clef bass
    \new Voice = "tenor" { \voiceOne \tenor }
    \new Voice = "bass" { \voiceTwo \bass }
  >>
>>

\score {
  <<
    \chordsPart
    \choirPart
  >>
  \layout { }
}
\score { \unfoldRepeats { << \chordsPart \\ \soprano \alto \\ \tenor \bass >> }
  \midi {
    \context { \Score midiChannelMapping = #'instrument }
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
  }
}
</score>
