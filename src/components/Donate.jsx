export default function Donate() {
    return (
        <div className="w-full max-w-3xl p-8">
            <h1 className="text-2xl font-bold mb-6 text-[#ff7b00]">Support silicon.tools</h1>

            <div className="space-y-6 text-gray-300">
                <p>
                    silicon.tools is a free and open-source project. If you find it useful,
                    please consider supporting its development.
                </p>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[#ff7b00]">Ways to Support</h2>

                    <div className="bg-[#1a1a1a] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-[#ff7b00]">Ko-fi Donation</h3>
                        <p className="mb-4">
                            Make a one-time donation through Ko-fi to help cover hosting costs and support development.
                        </p>
                        <a
                            href="https://ko-fi.com/silicontools"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#ff7b00] text-black px-6 py-2 rounded hover:bg-[#ff9533] transition-colors"
                        >
                            Donate on Ko-fi
                        </a>
                    </div>

                    <div className="bg-[#1a1a1a] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-[#ff7b00]">GitHub Sponsorship</h3>
                        <p className="mb-4">
                            Become a GitHub sponsor to support ongoing development and maintenance.
                        </p>
                        <a
                            href="https://github.com/sponsors/nsarrazin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#ff7b00] text-black px-6 py-2 rounded hover:bg-[#ff9533] transition-colors"
                        >
                            Sponsor on GitHub
                        </a>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-3 text-[#ff7b00]">Other Ways to Help</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Star the project on GitHub</li>
                        <li>Report bugs and suggest features</li>
                        <li>Contribute to the codebase</li>
                        <li>Share the project with others</li>
                    </ul>
                </div>
            </div>
        </div>
    );
} 