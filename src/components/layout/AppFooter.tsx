function AppFooter() {
	return (
		<div className="mt-7">
			<p className="text-muted-foreground text-sm text-center py-5">
				© {new Date().getFullYear()} {import.meta.env.VITE_BRAND_NAME}
			</p>
		</div>
	);
}

export default AppFooter;
