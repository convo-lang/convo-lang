#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(scriptDir,'..');
const homebrewCoreRoot=resolve(repoRoot,'../homebrew-core');

const packageJsonPath=resolve(repoRoot,'packages/cli/package.json');
const armBinaryPath=resolve(repoRoot,'packages/cli-darwin-arm64/bin/convo');
const x64BinaryPath=resolve(repoRoot,'packages/cli-darwin-x64/bin/convo');
const formulaDir=resolve(homebrewCoreRoot,'Formula/c');
const formulaPath=resolve(formulaDir,'convo.rb');

const requireFileAsync=async (filePath:string):Promise<void>=>{
    try{
        await access(filePath);
    }catch{
        console.error(`Missing required file: ${filePath}`);
        process.exit(1);
    }
};

const sha256FileAsync=async (filePath:string):Promise<string>=>{
    const content=await readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
};

await requireFileAsync(packageJsonPath);
await requireFileAsync(armBinaryPath);
await requireFileAsync(x64BinaryPath);

const packageJson=JSON.parse(await readFile(packageJsonPath,'utf8')) as {version?:string};
const version=packageJson.version;

if(!version){
    console.error(`Unable to read version from ${packageJsonPath}`);
    process.exit(1);
}

const armSha256=await sha256FileAsync(armBinaryPath);
const x64Sha256=await sha256FileAsync(x64BinaryPath);

await mkdir(formulaDir,{recursive:true});

const formula=`class Convo < Formula
  desc "Convo-Lang CLI"
  homepage "https://github.com/convo-lang/convo-lang/tree/main/packages/cli#readme"
  version "${version}"
  license "MIT"

  depends_on :macos

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/convo-lang/convo-lang/releases/download/v${version}/convo-darwin-arm64"
      sha256 "${armSha256}"
    else
      url "https://github.com/convo-lang/convo-lang/releases/download/v${version}/convo-darwin-x64"
      sha256 "${x64Sha256}"
    end
  end

  def install
    binary = Hardware::CPU.arm? ? "convo-darwin-arm64" : "convo-darwin-x64"
    chmod 0755, binary
    bin.install binary => "convo"
  end

  test do
    system "#{bin}/convo", "--help"
  end
end
`;

await writeFile(formulaPath,formula);

console.info('Updated Homebrew formula:');
console.info(`  ${formulaPath}`);
console.info('');
console.info(`Version: ${version}`);
console.info(`Apple Silicon SHA256: ${armSha256}`);
console.info(`Intel SHA256: ${x64Sha256}`);
