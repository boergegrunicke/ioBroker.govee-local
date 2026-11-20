import React, { useState } from 'react';
import { Box, Chip, FormControl, FormHelperText, TextField } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

interface ChipInputProps {
    label: string;
    value: string[] | undefined;
    onChange: (value: string[]) => void;
}

/**
 * List of strings shown as chips, like jsonConfig's `chips` field:
 * ENTER adds the typed text (blank entries and duplicates are ignored),
 * BACKSPACE in an empty input removes the last chip, leaving the field clears the input.
 *
 * @param props see ChipInputProps
 */
export default function ChipInput(props: ChipInputProps): React.JSX.Element {
    const chips = props.value || [];
    const [input, setInput] = useState('');

    const add = (): void => {
        if (input.trim().length && !chips.includes(input)) {
            props.onChange([...chips, input]);
        }
        setInput('');
    };

    const remove = (index: number): void => {
        const next = [...chips];
        next.splice(index, 1);
        props.onChange(next);
    };

    return (
        <FormControl
            fullWidth
            variant="standard"
        >
            <TextField
                variant="standard"
                fullWidth
                label={I18n.t(props.label)}
                value={input}
                onChange={e => setInput(e.target.value)}
                onBlur={() => setInput('')}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        add();
                    } else if (e.key === 'Backspace' && !input && chips.length) {
                        remove(chips.length - 1);
                    }
                }}
                slotProps={{
                    inputLabel: { shrink: chips.length > 0 || input.length > 0 || undefined },
                    input: {
                        startAdornment: chips.length ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1, my: 0.5 }}>
                                {chips.map((chip, i) => (
                                    <Chip
                                        key={chip}
                                        label={chip}
                                        size="small"
                                        onDelete={() => remove(i)}
                                    />
                                ))}
                            </Box>
                        ) : undefined,
                        sx: { flexWrap: 'wrap' },
                    },
                }}
            />
            <FormHelperText>{I18n.t('_pressEnterToAdd')}</FormHelperText>
        </FormControl>
    );
}
