class Openskill < Formula
  desc "One Skill. All Your AI. — Cross-domain AI skill asset manager"
  homepage "https://github.com/KalenTang666/OpenSkill"
  url "https://github.com/KalenTang666/OpenSkill/archive/refs/tags/v1.0.0.tar.gz"
  license "MIT"

  depends_on "node@20"

  def install
    cd "packages/cli" do
      system "npm", "install", *std_npm_args
      bin.install_symlink Dir["#{libexec}/bin/*"]
    end
  end

  test do
    assert_match "OpenSkill", shell_output("#{bin}/oski --version")
  end
end
