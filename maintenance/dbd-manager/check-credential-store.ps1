$ErrorActionPreference = 'Stop'
# Check availability with a disposable, non-secret canary. Never reads existing credentials.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class SanLeanCredentialProbe {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct Credential {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public long LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool Write(ref Credential credential, uint flags);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool Delete(string target, uint type, uint flags);
}
'@
$target = 'SanLean-Gestor-Probe-' + [Guid]::NewGuid().ToString('N')
$blob = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni('availability-check')
try {
  $credential = New-Object SanLeanCredentialProbe+Credential
  $credential.Type = 1; $credential.TargetName = $target; $credential.UserName = 'SanLean-test'
  $credential.CredentialBlob = $blob; $credential.CredentialBlobSize = 36; $credential.Persist = 2
  if (![SanLeanCredentialProbe]::Write([ref]$credential,0)) { throw 'El almacen seguro de Windows no esta disponible. No se iniciara el acceso a GitHub.' }
  if (![SanLeanCredentialProbe]::Delete($target,1,0)) { throw 'No se pudo completar la comprobacion del almacen seguro.' }
  Write-Output 'Almacen seguro de Windows disponible.'
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($blob) }
