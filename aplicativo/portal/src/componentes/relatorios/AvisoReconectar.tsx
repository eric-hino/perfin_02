import BotaoGoogle from "../auth/BotaoGoogle";
import ui from "../ui/ui.module.css";

/** Pede para reconectar a conta Google quando a autorização expirou ou não existe. */
export default function AvisoReconectar() {
  return (
    <div className={ui.secao}>
      <p className={ui.aviso_legal}>
        Para usar o Google Agenda, o Drive e o Gmail, conecte sua conta Google (se você entrou com e-mail e senha,
        use o mesmo e-mail do administrador).
      </p>
      <BotaoGoogle rotulo="Conectar conta Google" claro />
    </div>
  );
}
