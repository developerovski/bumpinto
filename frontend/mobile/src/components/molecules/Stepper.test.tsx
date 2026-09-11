import { render, screen } from "@testing-library/react-native";

import { tap } from "../../testUtils/interact";
import Stepper from "./Stepper";

/* Artboard P3 `.stp` — `−  4  +`. Sınırda düğme KAPALI görünür (a11y durumu) ama `disabled`
   DEĞİLDİR: kapanan düğme ekran okuyucu odağını düşürürdü (W-18 inceleme bulgusunun RN karşılığı).
   Değer sessizce kırpılmaz — basış hiçbir şey yapmaz. TEST BAŞINA TEK `render`. */
test("sınırda düğme kapalı DURUMDA ama basılabilir kalır; değer sınırı aşmaz; öbür yön çalışır", async () => {
  const onChange = jest.fn();
  await render(
    <Stepper
      value={3}
      min={3}
      max={8}
      onChange={onChange}
      label="Kaç kişi"
      decLabel="Bir kişi azalt"
      incLabel="Bir kişi artır"
    />,
  );
  const dec = screen.getByLabelText("Bir kişi azalt");
  expect(dec.props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByLabelText("Bir kişi artır").props.accessibilityState).toMatchObject({ disabled: false });

  await tap("Bir kişi azalt");
  expect(onChange).not.toHaveBeenCalled();

  await tap("Bir kişi artır");
  expect(onChange).toHaveBeenCalledWith(4);
  expect(screen.getByText("3")).toBeTruthy();
});
