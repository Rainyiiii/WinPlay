# SPDX-License-Identifier: GPL-3.0-or-later
# Original WinPlay W/play vector artwork.
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Drawing
$iconRoot=Join-Path $projectRoot 'resources/icons'
New-Item -ItemType Directory -Force $iconRoot | Out-Null
function RoundPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
 $p=New-Object System.Drawing.Drawing2D.GraphicsPath
 $d=$r*2
 $p.AddArc($x,$y,$d,$d,180,90);$p.AddArc($x+$w-$d,$y,$d,$d,270,90)
 $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90);$p.AddArc($x,$y+$h-$d,$d,$d,90,90);$p.CloseFigure()
 return ,$p
}
$images=@()
foreach($size in @(16,32,48,64,128,256,512)){
 $bitmap=New-Object System.Drawing.Bitmap($size,$size)
 $drawing=[System.Drawing.Graphics]::FromImage($bitmap)
 $drawing.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $drawing.Clear([System.Drawing.Color]::Transparent)
 $drawing.ScaleTransform(($size/108.0),($size/108.0))
 $dark=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#12394D'))
 $blue=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#30D6CD'))
 $white=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FFFFFF'))
 $p=RoundPath 0 0 108 108 26;$drawing.FillPath($dark,$p);$p.Dispose()
 $pen=New-Object System.Drawing.Pen($blue,10);$pen.StartCap=[System.Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=[System.Drawing.Drawing2D.LineCap]::Round;$pen.LineJoin=[System.Drawing.Drawing2D.LineJoin]::Round
 $drawing.DrawLines($pen,[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(23,38),[System.Drawing.PointF]::new(34,72),[System.Drawing.PointF]::new(48,47),[System.Drawing.PointF]::new(60,72)))
 $drawing.FillPolygon($white,[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(67,32),[System.Drawing.PointF]::new(90,53),[System.Drawing.PointF]::new(67,74)))
 $drawing.FillEllipse($blue,21,20,7,7)
 $stream=New-Object System.IO.MemoryStream;$bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png);$png=$stream.ToArray()
 if($size -ge 256){[IO.File]::WriteAllBytes((Join-Path $iconRoot "winplay-$size.png"),$png)}
 if($size -le 256){$images+=@{size=$size;bytes=$png}}
 $stream.Dispose();$pen.Dispose();$dark.Dispose();$blue.Dispose();$white.Dispose();$drawing.Dispose();$bitmap.Dispose()
}
$writer=New-Object System.IO.BinaryWriter([System.IO.File]::Create((Join-Path $iconRoot 'winplay.ico')))
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$images.Count)
$offset=6+16*$images.Count
foreach($entry in $images){$dimension=if($entry.size -eq 256){0}else{$entry.size};$writer.Write([byte]$dimension);$writer.Write([byte]$dimension);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$entry.bytes.Length);$writer.Write([uint32]$offset);$offset+=$entry.bytes.Length}
foreach($entry in $images){$writer.Write([byte[]]$entry.bytes)}$writer.Close()
Copy-Item -LiteralPath (Join-Path $iconRoot 'winplay-256.png') -Destination (Join-Path $projectRoot 'src/ui/winplay.png') -Force
