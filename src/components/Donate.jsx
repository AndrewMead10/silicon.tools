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
                    <button
                        className="button-primary w-full p-4"
                        onClick={() => window.location.href = 'https://donate.stripe.com/8wM8Awahy7537oAbII'}
                    >
                        Donate with Stripe
                    </button>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-3 text-[#ff7b00]">Other Ways to Help</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Star the project on <a className="text-[#ff7b00] hover:text-[#ff9533] hover:underline" href="https://github.com/andrewmead10/silicon.tools" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                        <li>Report bugs and suggest features</li>
                        <li>Contribute to the codebase</li>
                        <li>Share the project with others</li>
                    </ul>
                </div>
            </div>
        </div>
    );
} 