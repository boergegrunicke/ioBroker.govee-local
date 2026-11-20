import React, { useEffect, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

interface NumberFieldProps {
    /** native config attribute */
    attr: string;
    label: string;
    value: number | undefined;
    min: number;
    max: number;
    /** unit shown at the end of the input, e.g. "s" */
    unit?: string;
    onChange: (attr: string, value: number) => void;
    /** Reports a validation error (translation key) or null if valid. */
    onError: (attr: string, error: string | null) => void;
}

/**
 * Validates a number input like jsonConfig's `number` field does.
 *
 * @param text raw input text
 * @param min minimum allowed value
 * @param max maximum allowed value
 * @returns translation key of the error, or null if valid
 */
export function validateNumber(text: string, min: number, max: number): string | null {
    if (text.trim() === '' || isNaN(Number(text))) {
        return '_notANumber';
    }
    const value = Number(text);
    if (value < min) {
        return '_tooSmall';
    }
    if (value > max) {
        return '_tooBig';
    }
    return null;
}

/**
 * Number input with min/max validation. Invalid values block saving via onError.
 *
 * @param props see NumberFieldProps
 */
export default function NumberField(props: NumberFieldProps): React.JSX.Element {
    const { attr, value, min, max, onError } = props;
    const [text, setText] = useState<string>(value === undefined || value === null ? '' : String(value));
    const [prevValue, setPrevValue] = useState(value);

    // follow external changes (e.g. config loaded) unless the input already represents that value
    if (value !== prevValue) {
        setPrevValue(value);
        if (value !== undefined && value !== null && Number(text) !== value) {
            setText(String(value));
        }
    }

    const error = validateNumber(text, min, max);

    useEffect(() => {
        onError(attr, error);
    }, [attr, error, onError]);

    // a hidden field must not block saving
    useEffect(() => () => onError(attr, null), [attr, onError]);

    return (
        <TextField
            variant="standard"
            type="number"
            fullWidth
            label={I18n.t(props.label)}
            value={text}
            error={!!error}
            helperText={error ? I18n.t(error) : undefined}
            slotProps={{
                htmlInput: { min, max },
                input: props.unit
                    ? { endAdornment: <InputAdornment position="end">{props.unit}</InputAdornment> }
                    : undefined,
            }}
            onChange={e => {
                const newText = e.target.value;
                setText(newText);
                if (newText.trim() !== '' && !isNaN(Number(newText))) {
                    props.onChange(attr, Number(newText));
                }
            }}
        />
    );
}
