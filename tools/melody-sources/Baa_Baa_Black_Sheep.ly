<score sound raw>
\header { tagline = ##f }
\layout { indent = 0 line-width = #200
  \context { \Score \remove "Bar_number_engraver" }
  \context { \Voice \remove "Dynamic_engraver" }
}

global = { \key e \major \numericTimeSignature \time 2/4 \set Staff.midiInstrument = "classical" }

right = \relative c' { \global \autoBeamOff
  e4 e | b' b | cis8 dis e cis | b2 |
  a4 a | gis gis | fis fis | e2 \bar "||"
  b'4 b8 b | a4 a8 a8 | gis4 gis8 gis | fis4.
  fis8 | b4 b8 b | a b cis a | gis4 fis8 fis | e2 \bar "|."
}
\addlyrics { Baa, baa, black sheep,
  have you an -- y wool?
  Yes, sir, yes, sir,
  three bags full;
  One for the mas -- ter,
  and one for the dame,
  And one for the lit -- tle boy
  Who lives down the lane. 
}

left = \relative c' { \global
  e,8\ppp [b' gis b] | e,8 [b' gis b] | e, [cis' a cis] | gis [e' b e] |
  fis, [b a b] | e [b gis b] | dis, [b' fis b] | e [b gis b] \bar "||"
  e, [b' gis b] | fis [b a b] | e, [b' gis b] | dis [b fis b] |
  e, [b' gis b] | fis [gis a fis] | e [gis b, a'] | <gis e>2 |
}

\score {
  \new ChoirStaff <<
    \new Staff = "right"
    \right
    \new Staff = "left"
    { \clef bass \left }
  >>
  \layout { }
  \midi {
    \tempo 4=112
  }
}
</score>}}
