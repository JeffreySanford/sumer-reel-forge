param(
  [switch]$ListVoices,
  [string]$InputPath,
  [string]$OutputPath,
  [string]$TimingsPath,
  [string]$Voice = 'Microsoft Mark',
  [ValidateRange(-10, 10)]
  [int]$Rate = -1
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  if ($ListVoices) {
    $synthesizer.GetInstalledVoices() | ForEach-Object {
      $_.VoiceInfo.Name
    }
    exit 0
  }

  if (-not $InputPath -or -not $OutputPath -or -not $TimingsPath) {
    throw 'InputPath, OutputPath, and TimingsPath are required.'
  }

  $resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
  $resolvedTimings = [System.IO.Path]::GetFullPath($TimingsPath)
  $text = [System.IO.File]::ReadAllText($resolvedInput).Trim()
  if (-not $text) {
    throw 'Narration input is empty.'
  }

  $synthesizer.SelectVoice($Voice)
  $synthesizer.Rate = $Rate
  $synthesizer.Volume = 100

  $timings = [System.Collections.Generic.List[object]]::new()
  $handler = [System.EventHandler[System.Speech.Synthesis.SpeakProgressEventArgs]] {
    param($sender, $eventArgs)
    $timings.Add([pscustomobject]@{
      text = $eventArgs.Text
      characterPosition = $eventArgs.CharacterPosition
      characterCount = $eventArgs.CharacterCount
      audioPositionSeconds = $eventArgs.AudioPosition.TotalSeconds
    })
  }
  $synthesizer.add_SpeakProgress($handler)

  $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(
    16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
  )
  $synthesizer.SetOutputToWaveFile($resolvedOutput, $format)
  $synthesizer.Speak($text)
  $synthesizer.SetOutputToNull()
  $synthesizer.remove_SpeakProgress($handler)

  $timings | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $resolvedTimings -Encoding utf8
  Write-Output "Synthesized $($timings.Count) words with voice '$Voice' at rate $Rate."
}
finally {
  $synthesizer.Dispose()
}
