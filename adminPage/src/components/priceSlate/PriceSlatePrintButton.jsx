import { Button } from '../../../../shared/ui/index.js';
import { downloadPriceSlateReceipt } from '../../utils/priceSlateReceipt.js';

export default function PriceSlatePrintButton({ booking, items, totalCents, disabled = false }) {
  return (
    <Button
      type="button"
      onClick={() => downloadPriceSlateReceipt(booking, { items, total_cents: totalCents })}
      disabled={disabled}
    >
      Download receipt PDF
    </Button>
  );
}
