export function VerifiedBadges({
  idChecked,
  addressVerified,
}: {
  idChecked: boolean;
  addressVerified: boolean;
}) {
  if (!idChecked && !addressVerified) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {idChecked && (
        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-xs font-semibold text-teal">&#10003; ID Checked</span>
      )}
      {addressVerified && (
        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-xs font-semibold text-teal">&#10003; Address Verified</span>
      )}
    </div>
  );
}