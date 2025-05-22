import React, {createContext, ReactNode, useContext, useState} from 'react';
import {Button, Dialog, Paragraph, Portal} from 'react-native-paper';

// Define types for the context
interface MessageDialogContextType {
    showMessage: (message: string) => void;
}

// Create Context with an empty default value
const MessageDialogContext = createContext<MessageDialogContextType | undefined>(undefined);

interface MessageDialogProviderProps {
    children: ReactNode;
}

export const MessageDialogProvider: React.FC<MessageDialogProviderProps> = ({children}) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState<string>('');

    const showMessage = (msg: string) => {
        setMessage(msg);
        setVisible(true);
    };

    const hideMessage = () => setVisible(false);

    return (
        <MessageDialogContext.Provider value={{showMessage}}>
            {children}
            <Portal>
                <Dialog visible={visible} onDismiss={hideMessage}>
                    <Dialog.Title>Notice</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>{message}</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideMessage}>OK</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </MessageDialogContext.Provider>
    );
};

// Custom Hook to use in Screens
export const useMessageDialog = (): MessageDialogContextType => {
    const context = useContext(MessageDialogContext);
    if (!context) {
        throw new Error('useMessageDialog must be used within a MessageDialogProvider');
    }
    return context;
};
