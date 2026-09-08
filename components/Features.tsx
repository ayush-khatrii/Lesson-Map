"use client";
import { FaChartLine, FaFilePdf, FaGripVertical, FaMagic } from "react-icons/fa";
import { motion } from "framer-motion";
import { AuroraText } from "./ui/aurora-text";
import { MagicCard } from "./ui/magic-card";
import { Badge } from "./ui/badge";
const features = [
	{
		title: "Drag & Drop Builder",
		description: "Create and organize your course outline visually with an intuitive drag & drop interface.",
		icon: <FaGripVertical className="text-3xl text-indigo-400" />,
	},
	{
		title: "AI-Assisted Creation",
		description: "Use AI to instantly generate structured outlines, lesson ideas, and topic flow.",
		icon: <FaMagic className="text-3xl text-purple-400" />,
	},
	{
		title: "PDF Export",
		description: "Export your outlines into clean, printable PDFs for easy sharing and presentation.",
		icon: <FaFilePdf className="text-3xl text-pink-400" />,
	},
	{
		title: "Progress Indicators",
		description: "Track and display progress for your students across lessons and modules.",
		icon: <FaChartLine className="text-3xl text-teal-400" />,
	},
];

const Features = () => {
	return (
		<section className="pb-20">
			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
				<motion.div
					initial={{ scale: 1, y: 100, opacity: 0 }}
					whileInView={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.5 } }}
					transition={{ type: "keyframes", duration: 0.6 }}
				>
					<Badge variant={"secondary"} className="text-base rounded-full my-5 py-0 px-4">
						Features
					</Badge>
				</motion.div>
				<motion.h2
					initial={{ scale: 1, y: 50, opacity: 0 }}
					whileInView={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.5 } }}
					transition={{ type: "keyframes", duration: 0.3 }}
					className="text-4xl md:text-5xl font-bold mb-4">
					Build Smarter, Not Harder
				</motion.h2>
				<motion.p
					initial={{ scale: 1, y: 50, opacity: 0 }}
					whileInView={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.1 } }}
					transition={{ type: "keyframes", duration: 0.3 }}

					className="mb-12 text-lg max-w-md mx-auto text-muted-foreground">
					The ultimate independent course outline builder built for creators, educators, and innovators.
				</motion.p>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
					{features.map((feature, index) => (

						<motion.div
							key={index}
							whileHover={{ scale: 1.05, y: -5 }}
							initial={{ scale: 1, y: 50, opacity: 0 }}
							whileInView={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.5, delay: index * 0.1 } }}
							transition={{ type: "keyframes", duration: 0.3 }}
							className=""
						>
							<MagicCard className="relative bg-card cursor-pointer overflow-hidden rounded-2xl p-8">
								<div className="flex flex-col items-center gap-4">
									<div className="p-4 bg-white/10 rounded-full border">
										{feature.icon}
									</div>
									<h3 className="text-xl font-semibold">{feature.title}</h3>
									<p className="text-muted-foreground text-sm">{feature.description}</p>
								</div>
							</MagicCard>
						</motion.div>
					))}
				</div>
			</div>
		</section >
	);
}

export default Features
