// carecore-frontend/components/ui/PrimaryButton.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../components/ui/PrimaryButton';

describe('PrimaryButton', () => {
  // Mock function para simular el evento de presionar
  const mockOnPress = jest.fn();

  // Reset mock before each test
  beforeEach(() => {
    mockOnPress.mockClear();
  });

  // Caso 1: Verifica que el botón se renderiza con el título correcto
  test('renders with the correct title', () => {
    const { getByText } = render(<PrimaryButton title="Guardar Registro" onPress={mockOnPress} />);
    // Usamos getByText para encontrar el componente por su texto visible
    expect(getByText('Guardar Registro')).toBeTruthy();
  });

  // Caso 2: Verifica que la función onPress se llama al presionar
  test('calls onPress when the button is pressed', () => {
    const { getByText } = render(<PrimaryButton title="Aceptar" onPress={mockOnPress} />);

    // Simula el evento de presión (tap)
    fireEvent.press(getByText('Aceptar'));

    // Verifica que la función mock se haya llamado exactamente una vez
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  // Caso 3: Verifica que el botón esté deshabilitado cuando disabled=true
  test('is disabled when the disabled prop is true', () => {
    const { getByText } = render(
      <PrimaryButton title="Enviar" onPress={mockOnPress} disabled={true} />,
    );
    const buttonElement = getByText('Enviar').parent; // El padre es el TouchableOpacity

    // Usamos el matcher de jest-native para verificar el estado de deshabilitación
    expect(buttonElement).toBeDisabled();

    // Intenta presionar el botón deshabilitado
    fireEvent.press(buttonElement!);

    // Verifica que onPress NO se haya llamado
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  // Caso 4: Verifica que se apliquen estilos personalizados
  test('applies custom styles passed via the style prop', () => {
    const customStyle = { backgroundColor: 'red', borderColor: 'red' };
    const { getByTestId } = render(
      <PrimaryButton title="Custom" onPress={mockOnPress} style={customStyle} />,
    );
    const buttonElement = getByTestId('primary-button');

    // Verifica si el estilo aplicado coincide con el estilo personalizado
    // Verificamos cada propiedad individualmente
    expect(buttonElement).toHaveStyle({ backgroundColor: 'red' });
    expect(buttonElement).toHaveStyle({ borderColor: 'red' });
  });
});
