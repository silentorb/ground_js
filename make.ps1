function Get-ScriptDirectory
{
$Invocation = (Get-Variable MyInvocation -Scope 1).Value
Split-Path $Invocation.MyCommand.Path
}
$local = Get-ScriptDirectory
tsc $local\lib\export.ts --out $local\ground.js --declaration --sourcemap --module commonjs