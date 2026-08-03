<score sound="1">
\transpose c bes,
\new Staff <<
\clef treble \key g \major {
      \time 4/4 \partial 4     
      \relative g' {
	b4 | b b ais b | d c e, a | g fis8 g a4 d, | b'2. \bar"" \break 
        b4 | b b e d | d c e, a | g fis8 g b4 a | g2. \bar"" \break 
        b4 | b b a g | fis2 fis4 fis | e fis g a | b2. \bar"" \break
        b4 | b b ais b | d c e, e' | d g, b4. a8 | g2. \bar"|."
      }
    }
%\new Lyrics \lyricmode {
%}
>>
\layout { indent = #0 }
\midi { \tempo 4 = 80 }
</score>
<score sound="1">
<< <<
\new Staff { \clef treble \time 4/2 \partial 2 \key f \major \set Staff.midiInstrument = "church organ" \omit Staff.TimeSignature \set Score.tempoHideNote = ##t \override Score.BarNumber  #'transparent = ##t
  \relative c' 
  \repeat unfold 2 { << { c2 | f f f g | a4\(( g) a( bes)\) c2 \breathe \bar"||" a | bes a4( f) g2 g f1. \breathe \bar"||" \break } \\
  { c2 | c d c d4( e) | f2 f e d | d f f e | f1. } >> }
  \relative c' {
  << { f4( a) | c2. d4 c( bes) a( g) | f( g a bes) c2 \breathe \bar"||" c, | f a g f | c1 \breathe \bar"||" \break
  c1 | f2 f f g | a4( g) a( bes) c2 \breathe \bar"||" a | bes a4( f) g2 g | f1. \bar"|." } \\
  { f2 | e2. d4 e2 c | c( f) e c | c c bes a4( bes) | c1
  c1 | c2 d c d4( e) | f2 f e d | d f f e | f1. } >> }
}
%%\new Lyrics \lyricsmode { put lyrics here if you insist }
\new Staff { \clef bass \key f \major \set Staff.midiInstrument = "church organ" \omit Staff.TimeSignature
  \relative c'
  \repeat unfold 2 { << { g2 | a bes c bes | c f, g f | bes c d c4( bes) | a1. } \\
  { e2 | f bes a g | f d c d | g, a bes c | f1. } >> }
  \relative c' {
  << { a2 | a2. f4 c'2 c4( bes) | a2( f) g e | f f d4( e) f2 | e1
  f2( g) | a bes c bes | c f, g f | bes c4( a) c2 c4( bes) | a1. } \\
  { d,2 | a2. bes4 c2 d4( e) | f2( d) c c4( bes) | a2 f bes d | c1
  d2( e) | f bes a g | f d c d | g, a4( d) c2 c | <f f,>1. } >> }
}
>> >>
\layout { indent = #0 }
\midi { \tempo 2 = 80 }
</score>
