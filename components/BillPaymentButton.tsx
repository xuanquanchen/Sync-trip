import React from 'react';
import { Alert, Linking } from 'react-native';
import { Button } from 'react-native-paper';
import { Bill } from '../types/Bill';

interface BillPaymentButtonProps {
  bill: Bill;
  currentUserUid: string;
  /**
   * Optional PayPal business account (receiver email).
   * If not provided, redirects to generic PayPal login page.
   */
  paypalBusinessAccount?: string;
  onArchive?: () => void;
}

const BillPaymentButton: React.FC<BillPaymentButtonProps> = ({
  bill,
  currentUserUid,
  paypalBusinessAccount,
  onArchive,
}) => {
  const currency = bill.currency || 'USD';

  // Compute how much the current user owes or is owed
  const amountOwed = React.useMemo(() => {
    if (!bill.summary || !bill.summary[currentUserUid]) return 0;
    return Object.values(bill.summary[currentUserUid]).reduce(
      (sum, v) => sum + v,
      0,
    );
  }, [bill.summary, currentUserUid]);

  if (amountOwed <= 0) return null;

  const handlePay = async () => {
    //onArchive?.();
    try {
      if (paypalBusinessAccount) {
        const url =
        `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
        `&business=${encodeURIComponent(paypalBusinessAccount)}` +
        `&item_name=${encodeURIComponent(bill.title)}` +
        `&amount=${amountOwed.toFixed(2)}` +
        `&currency_code=${currency}`;

        await Linking.openURL(url);
        } else {
          // Redirect to generic PayPal login
          await Linking.openURL('https://www.paypal.com/signin');
        }
    } catch (err) {
      console.error('Failed to open PayPal', err);
      Alert.alert('Error', 'Unable to open PayPal. Please try again later.');
      return;
    }

    Alert.alert(
      'Payment confirmation',
      'Have you completed the payment?',
      [
        { text: 'Not yet' },
        {
          text: 'Yes, done',
          onPress: () => onArchive?.(),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Button
      mode="contained"
      onPress={handlePay}
      style={{ marginVertical: 16, alignSelf: 'center' }}
    >
      Pay with PayPal
    </Button>
  );
};

export default BillPaymentButton;
