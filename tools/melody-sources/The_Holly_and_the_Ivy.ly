|content=<score sound="1">
\new Staff <<
  \time 3/4
  \key g \major
  \partial 4
  \relative c''
{ \set Staff.midiInstrument = #"flute"
  \autoBeamOff
  g4 |
  g8 g8 g4 e'4 |
  d4 b4. g8 |
  g8 g8 g4 e'4 |
  d2 d8 ([c8]) |
  b8 a8 g4 b8 b8 |
  e,8 e8 d4 g8 ([a8]) |
  b8 c8 b4 a4 |
  g2 r8 g8 |
  g8 g8 g4 e'4 |
  d4 ([b4]) g8 g8 |
  g8 g8 g4 e'4 |
  d2 d8 ([c8]) |
  b8 a8 g4 b4 |
  e,8 e8 d4 g8 a8 |
  b8 c8 b4 a4 |
  g2
  \bar "|."
}
\addlyrics {
  The
  hol -- ly and the i -- vy,
  When they are both full grown,
  Of all the trees that are in the wood,
  The hol -- ly bears the crown.
  The ri -- sing of the sun
  And the run -- ning of the deer,
  The play -- ing of the mer -- ry or -- gan,
  Sweet sing -- ing in the choir.
}
>>
\layout { indent = #0 }
\midi { \tempo 4 = 106 }
</score>
