function EmptyEndpointMessage({ type }: { type: string }) {
	return <p className="text-muted-foreground text-center py-4">No {type.toLowerCase()} defined for this endpoint.</p>;
}

export default EmptyEndpointMessage;
